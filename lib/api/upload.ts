/**
 * 图片上传 API 客户端
 *
 * 通用文件上传模块，支持：
 * - MD5 秒传检测
 * - Cloudflare R2 预签名 URL 直传
 */
import SparkMD5 from 'spark-md5'
import { fetchApi, API_BASE } from './accounts'
import { getAuthHeader } from './auth'

// ─── 类型定义 ───────────────────────────────────────────

/** 素材图片 */
export interface MaterialImage {
  md5: string
  filepath: string
  flare?: string
  url?: string
  size?: string
}

/** R2 预签名上传 URL 响应 */
export interface UploadURLResponse {
  is_uploaded: boolean
  url: string
}

// ─── 工具函数 ───────────────────────────────────────────

/**
 * 图片展示 URL
 *
 * 优先级：url（闲鱼 CDN）→ flare（R2 直链）→ filepath（本地，需拼接 API_BASE）
 */
export function imageDisplayUrl(image: MaterialImage | undefined | null): string {
  if (!image) return ''
  if (image.url) return image.url
  if (image.flare) return image.flare
  if (!image.filepath) return ''
  const filename = image.filepath.replace(/^data[\\/]/, 'api/').replace(/\\/g, '/')
  return `${API_BASE}/${filename}`
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

/** 检查图片 hash 是否已在服务端存在（秒传） */
export async function checkImageHash(md5: string): Promise<MaterialImage | null> {
  const authHeaders = await getAuthHeader()
  const resp = await fetch(`${API_BASE}/api/image/hash?md5=${encodeURIComponent(md5)}`, {
    headers: { ...authHeaders },
  })
  if (!resp.ok) return null
  const json = await resp.json()
  const img: MaterialImage = json.data ?? json
  if (img.url || img.flare || img.filepath) return img
  return null
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
 * @param uid 可选，账号 UID（传入时后端会额外上传到闲鱼 CDN）
 */
export async function completeFlareUpload(
  md5: string,
  suffix: string,
  uid?: string
): Promise<MaterialImage> {
  const params = new URLSearchParams({ md5, suffix })
  if (uid) params.set('uid', uid)
  return fetchApi<MaterialImage>(`/api/image/upload/flare/complete?${params}`)
}

/**
 * R2 一键上传：hash 秒传检测 → 获取预签名 URL → 上传 → 完成通知
 *
 * 封装了完整的 R2 上传流程，外部只需调用这一个函数即可。
 *
 * @param file 要上传的文件
 * @param uid 可选，账号 UID
 * @returns 上传结果（含 filepath 和可选的 url）
 *
 * @example
 * ```ts
 * const result = await uploadFileToFlare(file, 'uid_123')
 * console.log(imageDisplayUrl(result)) // CDN 可访问地址
 * ```
 */
export async function uploadFileToFlare(
  file: File,
  uid?: string
): Promise<MaterialImage> {
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
