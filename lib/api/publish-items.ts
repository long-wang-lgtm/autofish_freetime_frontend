/**
 * 发布实例 API 客户端
 */
import SparkMD5 from 'spark-md5'
import { fetchApi, API_BASE } from './accounts'
import { getAuthHeader } from './auth'

/** 素材图片 */
export interface MaterialImage {
  md5: string
  filepath: string
  url?: string
  size?: string
}

/** 图片展示 URL：优先 CDN，无 CDN 则用本地 filepath */
export function imageDisplayUrl(image: MaterialImage | undefined | null): string {
  if (!image) return ''
  if (image.url) return image.url
  if (!image.filepath) return ''
  // 去掉 data/ 或 data\ 前缀，统一转为正斜杠
  const filename = image.filepath.replace(/^data[\\/]/, 'api/').replace(/\\/g, '/')
  return `${API_BASE}/${filename}`
}

export interface PublishedItem {
  id: number
  opportunity_id: number
  item_group_id: string | null
  account_id: string
  title: string
  description: string
  price: number
  cover_plan_prompt: string
  cover_style_id: string
  cover_style_name: string
  category: string
  status: string
  publish_task_id: string
  item_gid: string
  error_message: string
  images: MaterialImage[]
  created_at: string
  updated_at: string
}

/** 部分字段响应 — 用于合并缓存，不可覆盖整个 item */
export interface RewriteResponse {
  id: number
  description: string
}

export interface CoverPlanResponse {
  id: number
  cover_plan_prompt: string
}

export interface ImageGenResponse {
  id: number
  images: MaterialImage[]
  status: string
}

export type PublishedItemStatus =
  | 'pending'
  | 'rewriting'
  | 'rewrite_done'
  | 'cover_planning'
  | 'cover_plan_done'
  | 'image_generating'
  | 'image_done'
  | 'publishing'
  | 'published'
  | 'publish_failed'

export async function listPublishedItems(params: {
  opportunity_id?: number
  account_id?: string
  status?: string
  page?: number
  page_size?: number
}) {
  const searchParams = new URLSearchParams()
  if (params.opportunity_id) searchParams.set('opportunity_id', String(params.opportunity_id))
  if (params.account_id) searchParams.set('account_id', params.account_id)
  if (params.status) searchParams.set('status', params.status)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.page_size) searchParams.set('page_size', String(params.page_size))

  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<{ total: number; items: PublishedItem[] }>(`/api/publish/items${query}`)
}

export async function createPublishedItem(opportunityId: number, accountId: string, title?: string, price?: number) {
  return fetchApi<PublishedItem>('/api/publish/items', {
    method: 'POST',
    body: JSON.stringify({
      opportunity_id: opportunityId,
      account_id: accountId,
      title: title || '',
      price: price || 0,
    }),
  })
}

export async function getPublishedItem(id: number) {
  return fetchApi<PublishedItem>(`/api/publish/items/${id}`)
}

export async function updatePublishedItem(id: number, data: Partial<PublishedItem>) {
  return fetchApi<PublishedItem>(`/api/publish/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePublishedItem(id: number) {
  return fetchApi<{ success: boolean }>(`/api/publish/items/${id}`, {
    method: 'DELETE',
  })
}

export async function triggerRewrite(itemId: number) {
  return fetchApi<RewriteResponse>(
    `/api/publish/items/${itemId}/rewrite`,
    { method: 'POST' }
  )
}

export async function triggerCoverPlan(itemId: number) {
  return fetchApi<CoverPlanResponse>(
    `/api/publish/items/${itemId}/cover-plan`,
    { method: 'POST' }
  )
}

export async function triggerImageGenerate(itemId: number) {
  return fetchApi<ImageGenResponse>(
    `/api/publish/items/${itemId}/generate-image`,
    { method: 'POST' }
  )
}

export interface PublishResultResponse {
  id: number
  success: boolean
  error?: string
}

export async function triggerPublish(itemId: number) {
  return fetchApi<PublishResultResponse>(
    `/api/publish/items/${itemId}/publish`,
    { method: 'POST' }
  )
}

export interface ChannelCategory {
  channelCateName: string
  channelCateId: string
}

export async function getChannelCategories(itemId: number) {
  return fetchApi<ChannelCategory[]>(`/api/publish/items/${itemId}/channel`, {
    method: 'POST',
  })
}

export async function retryPublishedItem(itemId: number) {
  return fetchApi<{ success: boolean; message: string; status: string }>(
    `/api/publish/items/${itemId}/retry`,
    { method: 'POST' }
  )
}

// ─── 图片上传工具 ───────────────────────────────────────────

/** 读取环境变量中的分块大小，默认 10KB */
function getChunkSize(): number {
  const raw = process.env.NEXT_PUBLIC_CHUNK_SIZE
  if (raw) {
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n > 0) return n
  }
  return 102400 // 默认 10KB
}

/** 分块上传并发数 */
const CHUNK_CONCURRENCY = 100

/**
 * 信号量并发执行：同时启动 concurrency 个 worker，
 * 每个 worker 完成当前任务后立即抢下一个，并发池始终满载。
 */
async function runWithSemaphore<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < tasks.length) {
      const i = cursor++
      results[i] = await tasks[i]()
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  await Promise.all(pool)
  return results
}

/** 使用 spark-md5 增量计算文件 MD5 */
function computeFileMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobSlice = File.prototype.slice
    const chunkSize = 2 * 1024 * 1024 // 2MB 一块读，避免卡主线程
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

/** 检查图片 hash 是否已在服务端存在（秒传） */
async function checkImageHash(md5: string): Promise<MaterialImage | null> {
  const authHeaders = await getAuthHeader()
  const resp = await fetch(`${API_BASE}/api/image/hash?md5=${encodeURIComponent(md5)}`, {
    headers: { ...authHeaders },
  })
  if (!resp.ok) return null
  const json = await resp.json()
  const img: MaterialImage = json.data ?? json
  if (img.url || img.filepath) return img
  return null
}

/** 上传单个分块 */
async function uploadOneChunk(
  md5: string,
  chunkIndex: number,
  totalChunks: number,
  blob: Blob,
  ext: string
): Promise<void> {
  const formData = new FormData()
  formData.append('md5', md5)
  formData.append('chunk_index', String(chunkIndex))
  formData.append('total_chunks', String(totalChunks))
  formData.append('ext', ext)
  formData.append('file', blob, `chunk_${chunkIndex}`)

  const authHeaders = await getAuthHeader()
  const resp = await fetch(`${API_BASE}/api/image/upload/chunk`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: formData,
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: `分块 ${chunkIndex} 上传失败` }))
    throw new Error(err.detail || `HTTP ${resp.status}`)
  }
}

/** 完成上传：通知服务端合并分块并绑定到素材 */
async function queryImageDone(itemId: number, md5: string): Promise<MaterialImage> {
  const authHeaders = await getAuthHeader()
  const resp = await fetch(
    `${API_BASE}/api/publish/items/${itemId}/image/query?md5=${encodeURIComponent(md5)}`,
    { method: 'POST', headers: { ...authHeaders } }
  )
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '图片绑定失败' }))
    throw new Error(err.detail || `HTTP ${resp.status}`)
  }
  const json = await resp.json()
  return (json.data ?? json) as MaterialImage
}

/** 从文件名提取扩展名（含点），如 ".png"；无扩展名时根据 MIME 推测 */
function getFileExt(file: File): string {
  const name = file.name
  const dot = name.lastIndexOf('.')
  if (dot > 0) return name.slice(dot).toLowerCase()

  // 无扩展名时根据 MIME 类型推测
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

/** 上传单张图片：MD5 → 秒传检测 → 分块上传 → 完成绑定 */
async function uploadOneImage(itemId: number, file: File): Promise<MaterialImage> {
  // 1. 计算 MD5 + 提取扩展名
  const [md5, ext] = await Promise.all([
    computeFileMD5(file),
    Promise.resolve(getFileExt(file)),
  ])

  // 2. 秒传检测
  const existing = await checkImageHash(md5)
  if (existing) {
    return await queryImageDone(itemId, md5)
  }

  // 3. 分块上传（传入扩展名）
  const chunkSize = getChunkSize()
  const totalChunks = Math.ceil(file.size / chunkSize)

  const chunkTasks = Array.from({ length: totalChunks }, (_, i) => {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    return { index: i, blob: file.slice(start, end) }
  })

  // 信号量并发上传：一个分块完成立即可启动下一个
  await runWithSemaphore(
    chunkTasks.map(({ index, blob }) =>
      () => uploadOneChunk(md5, index, totalChunks, blob, ext)
    ),
    CHUNK_CONCURRENCY
  )

  // 4. 完成绑定
  return await queryImageDone(itemId, md5)
}

/**
 * 上传图片到指定素材（三步流程：初始化 → 上传 → 完成）
 *
 * 单个文件调用，内部完成 MD5 秒传检测与分块并发上传。
 */
export async function uploadImage(itemId: number, file: File): Promise<MaterialImage> {
  return uploadOneImage(itemId, file)
}

/**
 * 批量并发上传多张图片
 *
 * @param concurrency 同时上传的图片数量，默认 3
 */
export async function uploadImages(
  itemId: number,
  files: File[],
  concurrency: number = 3
): Promise<MaterialImage[]> {
  const results: MaterialImage[] = []
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map((file) => uploadOneImage(itemId, file))
    )
    results.push(...batchResults)
  }
  return results
}

export async function sortImages(itemId: number, images: MaterialImage[]): Promise<void> {
  return fetchApi(`/api/publish/items/${itemId}/image/sort`, {
    method: 'POST',
    body: JSON.stringify({ images }),
  })
}

export async function reuploadImages(itemId: number): Promise<void> {
  return fetchApi(`/api/publish/items/${itemId}/image/reupload`, {
    method: 'POST',
  })
}
