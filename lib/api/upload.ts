/**
 * 图片上传 API 客户端
 *
 * 通用文件上传模块，支持：
 * - MD5 秒传检测
 * - Cloudflare R2 预签名 URL 直传
 */
import SparkMD5 from 'spark-md5'
import { fetchApi, API_BASE_URL } from '@/lib/utils/api'
import { getAuthHeader } from './auth'

// ─── 类型定义 ───────────────────────────────────────────

/**
 * 闲鱼侧图片对象 —— 后端 freefish 的 UploadImage，也是 /upload/flare/complete 的整个响应体。
 *
 * 上传链路里**只有这一种图片结构**：新上传直接返回它，秒传命中从 ImageAliCDNRecord
 * 的 cdn 里取出来的也是它。所以 uploadFileToFlare 的返回值恒为这个形状，调用方
 * 不必分辨手里这张图是刚传的还是早就有的。
 *
 * 只有闲鱼 CDN 的 url，没有本地路径、没有 R2 直链 —— 后端在这一步已经把图传上闲鱼。
 * 发布器要的 widthSize / heightSize 来自 pix（"宽x高"）。
 */
export interface AliCdnImage {
  url: string
  /** "宽x高"，如 "800x800" */
  pix?: string
  size?: string
  fileId?: string
  folderId?: string
  fileName?: string
  quality?: number
}

/**
 * /api/image/hash 的响应 —— 后端 ImageAliCDN 行，只是把闲鱼对象包了一层。
 *
 * 多出来的 md5 / localName / flareUrl 是后端记账用的，上传链路用不上，所以
 * uploadFileToFlare 会当场把 cdn 拆出来，不把这个包装泄漏给调用方。
 */
export interface ImageAliCDNRecord {
  md5: string
  localName?: string | null
  flareUrl?: string | null
  cdn?: AliCdnImage | null
}

/** R2 预签名上传 URL 响应 */
export interface UploadURLResponse {
  is_uploaded: boolean
  url: string
}

// ─── 工具函数 ───────────────────────────────────────────

/**
 * 图片展示地址 —— 闲鱼 CDN 直链。
 *
 * 留成一个函数而不是让各处直接取 image.url，是因为这个字段改过一次名
 * （url → cdn.url），而三个调用点都被断言盖住了，改名时没有一个地方报错。
 * 收敛到一处，下次再改至少只有一个地方要动。
 */
export function imageDisplayUrl(image: AliCdnImage | null | undefined): string {
  return image?.url ?? ''
}

/** 从文件名提取扩展名（含点），如 ".png"；无扩展名时根据 MIME 推测 */
export function getFileExt(file: File): string {
  const name = file.name
  const dot = name.lastIndexOf('.')
  if (dot > 0) return name.slice(dot).toLowerCase()

  const mime = file.type.toLowerCase()
  const MIME_MAP: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'image/svg+xml': '.svg',
  }
  return MIME_MAP[mime] ?? ''
}

/** 使用 spark-md5 增量计算文件 MD5 */
export function computeFileMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobSlice = File.prototype.slice
    const chunkSize = 2 * 1024 * 1024 // 2MB 一块读
    const chunks = Math.ceil(file.size / chunkSize)
    const spark = new SparkMD5.ArrayBuffer()
    const reader = new FileReader()
    let currentChunk = 0

    reader.onload = (e) => {
      spark.append(e.target!.result as ArrayBuffer)
      currentChunk++
      if (currentChunk < chunks) {
        loadNext()
      } else {
        resolve(spark.end())
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败，无法计算 MD5'))

    function loadNext() {
      const start = currentChunk * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      reader.readAsArrayBuffer(blobSlice.call(file, start, end))
    }
    loadNext()
  })
}

// ─── 秒传检测 ───────────────────────────────────────────

/**
 * 秒传检测 —— 这张图服务端是否已经有了。
 *
 * 未命中时后端返回 404，这是**正常结果**而不是故障，单独放行成 null。
 * 其余非 2xx 一律抛出：把 500 也当成「没传过」的话，调用方会白白重传一遍，
 * 而真正的故障就被这一句 return null 吞掉了。
 */
export async function checkImageHash(md5: string): Promise<AliCdnImage | null> {
  const authHeaders = await getAuthHeader()
  const resp = await fetch(`${API_BASE_URL}/api/image/hash?md5=${encodeURIComponent(md5)}`, {
    headers: { ...authHeaders },
  })
  if (resp.status === 404) return null
  if (!resp.ok) throw new Error(`秒传检测失败：HTTP ${resp.status}`)

  const json = await resp.json()
  const record: ImageAliCDNRecord = json.data ?? json
  return record.cdn ?? null
}

// ─── Cloudflare R2 预签名上传 ───────────────────────────

/**
 * 步骤 1：获取 R2 预签名上传 URL
 *
 * 如果文件已存在（is_uploaded=true），url 可直接访问资源，无需上传。
 * 如果文件不存在（is_uploaded=false），url 是 PUT 上传端点。
 */
export async function getFlareUploadUrl(
  md5: string,
  suffix: string
): Promise<UploadURLResponse> {
  const params = new URLSearchParams({ md5, suffix })
  return fetchApi<UploadURLResponse>(`/api/image/upload/flare/url?${params}`)
}

/**
 * 步骤 2：PUT 上传文件到 R2 预签名 URL
 *
 * @param uploadUrl 预签名上传端点
 * @param file 文件 Blob/File
 * @param contentType MIME 类型，如 "image/png"
 */
export async function uploadToR2(
  uploadUrl: string,
  file: Blob,
  contentType: string
): Promise<void> {
  const resp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!resp.ok) {
    throw new Error(`R2 上传失败: HTTP ${resp.status}`)
  }
}

/**
 * 步骤 3：通知后端上传完成
 *
 * @param md5 文件 MD5
 * @param suffix 文件后缀（含点），如 ".png"
 * @param uid 账号 UID。后端这个参数**没有默认值**，不传直接 422；
 *            图片也是靠它才传到闲鱼 CDN 的，所以必须给。
 *            签名里仍留成可选，是为了不惊动批量发布页现有的调用点。
 */
export async function completeFlareUpload(
  md5: string,
  suffix: string,
  uid?: string
): Promise<AliCdnImage> {
  const params = new URLSearchParams({ md5, suffix })
  if (uid) params.set('uid', uid)
  return fetchApi<AliCdnImage>(`/api/image/upload/flare/complete?${params}`)
}

/**
 * R2 一键上传：hash 秒传检测 → 获取预签名 URL → 上传 → 完成通知
 *
 * 封装了完整的 R2 上传流程，外部只需调用这一个函数即可。
 *
 * @param file 要上传的文件
 * @param uid 账号 UID
 * @returns 闲鱼图片对象。**两条路径形状一致** —— 秒传命中从 hash 响应的 cdn 里拆出来，
 *          新上传拿到的本来就是它，调用方不必分辨。
 *
 * @example
 * ```ts
 * const image = await uploadFileToFlare(file, uid)
 * console.log(imageDisplayUrl(image)) // 闲鱼 CDN 直链
 * ```
 */
export async function uploadFileToFlare(
  file: File,
  uid?: string
): Promise<AliCdnImage> {
  // 1. 计算 MD5 + 后缀
  const [md5, suffix] = await Promise.all([
    computeFileMD5(file),
    Promise.resolve(getFileExt(file)),
  ])

  // 2. 秒传检测：如果后端 DB 已有记录，直接返回
  const existing = await checkImageHash(md5)
  if (existing) return existing

  // 3. 获取 R2 预签名 URL（后端同时检查 R2 桶中是否已有文件）
  const { is_uploaded, url } = await getFlareUploadUrl(md5, suffix)

  // 4. 如果 R2 桶中也没有，执行 PUT 上传
  //    注意：Content-Type 必须与后端签名时一致（image/{后缀}），不能使用 file.type
  //    浏览器可能返回 image/jpeg 而签名是 image/jpg，不匹配会导致 net::ERR_FAILED
  if (!is_uploaded) {
    await uploadToR2(url, file, `image/${suffix.replace('.', '')}`)
  }

  // 5. 通知后端完成（入库 + 可选闲鱼 CDN 上传）
  return completeFlareUpload(md5, suffix, uid)
}
