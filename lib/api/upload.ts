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
 * 只有闲鱼 CDN 的 url，没有本地路径、没有 R2 直链 —— 后端在这一步已经把图传上闲鱼。
 * 发布器要的 widthSize / heightSize 来自 pix（"宽x高"）。
 *
 * 这是**内层**结构：素材图的元素（ImageAliCDNRecord）把它包在 cdn 里。手上拿着元素
 * 就必须显式取 .cdn，不要指望元素本身也长着 url。
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
 * 一张已上闲鱼的图 —— 后端 ImageAliCDN 行。
 *
 * 三个身份是同一个形状，所以只留这一个类型：/api/image/hash 的响应体、
 * uploadFileToFlare 的返回值、素材 material.images 的元素。
 *
 * md5 是主键，也是能让后端收下的唯一理由：PublishMaterial.images 声明为
 * list[MaterialImage] 且 md5 必填，少这一项 material.edit 直接 422。
 * localName 是后端的本地文件路径（cdn 为空时的兜底图源，见 imageDisplayUrl），
 * flareUrl 是后端记 R2 的账。两个都只读不写 —— 前端手里根本没有这些路径。
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

/** 本地图片的静态挂载点 —— 后端 free/free.py 把 <backend>/data/images 挂在这里 */
const LOCAL_IMAGE_MOUNT = '/api/images'

/**
 * 本地文件路径 → 可访问的 URL。
 *
 * localName 是后端的**文件系统路径**而不是 URL：根是后端工作目录，还带着
 * data/images 前缀（"data/images/<md5>.png"），直接拿它当 src 是 404。
 * 挂载点的根已经是 data/images 了，所以只取文件名再拼服务器地址。
 */
function localImageUrl(localName: string): string {
  const name = localName.split(/[\\/]/).pop()
  return name ? `${API_BASE_URL}${LOCAL_IMAGE_MOUNT}/${name}` : ''
}

/**
 * 图片展示地址 —— 从素材图元素里取出可以喂给 <img> 的地址。
 *
 * 收整个元素而不是收 cdn，因为地址藏在第二层（cdn.url）。这里曾经直接读
 * image.url：别名 MaterialImage = AliCdnImage 把两层结构拍平了，类型不报错，
 * 三处缩略图一起变空白。收敛到一处，下次再改至少只有一个地方要动。
 *
 * 闲鱼 CDN 优先，它是发布器真正会用的那张。cdn 为空时退回本地文件 —— AI 生成的
 * 封面由后端直接落盘（core/publish/write.py 只写 md5 和 filepath），要等发布
 * 那一刻才上闲鱼，在那之前只有本地路径可看。
 */
export function imageDisplayUrl(image: ImageAliCDNRecord | null | undefined): string {
  if (!image) return ''
  if (image.cdn?.url) return image.cdn.url
  return image.localName ? localImageUrl(image.localName) : ''
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
 *
 * 返回整行而不是只拆 cdn：调用方要的是「一张已上闲鱼的图」，md5 是它的主键，
 * 拆掉就还得再拼回去。
 */
export async function checkImageHash(md5: string): Promise<ImageAliCDNRecord | null> {
  const authHeaders = await getAuthHeader()
  const resp = await fetch(`${API_BASE_URL}/api/image/hash?md5=${encodeURIComponent(md5)}`, {
    headers: { ...authHeaders },
  })
  if (resp.status === 404) return null
  if (!resp.ok) throw new Error(`秒传检测失败：HTTP ${resp.status}`)

  const json = await resp.json()
  return json.data ?? json
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
 * @returns 一张已上闲鱼的图（ImageAliCDNRecord）。**两条路径形状一致** ——
 *          秒传命中原样返回后端那一行，新上传把本地算出的 md5 和拿回的 cdn 拼起来。
 *          返回值可以直接塞进 material.images，不用再加工。
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
): Promise<ImageAliCDNRecord> {
  // 1. 计算 MD5 + 后缀
  const [md5, suffix] = await Promise.all([
    computeFileMD5(file),
    Promise.resolve(getFileExt(file)),
  ])

  // 2. 秒传检测：如果后端 DB 已有记录，整行原样返回（localName 等痕迹一并带回）
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

  // 5. 通知后端完成（入库 + 闲鱼 CDN 上传）。
  //    complete 只回 cdn，md5 得自己补上 —— material.edit 收的是整行，缺 md5 就是 422
  return { md5, cdn: await completeFlareUpload(md5, suffix, uid) }
}
