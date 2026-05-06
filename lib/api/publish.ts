/**
 * 商品发布 API 客户端 - AI创作相关接口
 */
import { fetchApi } from './accounts' // Uses same fetchApi pattern

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export async function createRewriteTask(description: string, accountUids: string[]) {
  const res = await fetchApi<{ task_id: string }>('/api/publish/rewrite', {
    method: 'POST',
    body: JSON.stringify({
      source_description: description,
      account_uids: accountUids,
    }),
  })
  return res.task_id
}

export async function getRewriteStatus(taskId: string) {
  return fetchApi<{
    task_id: string
    status: string
    progress: Record<string, string>
    results: { uid: string; content: string; error: string | null }[]
    error?: string
  }>(`/api/publish/rewrite/status/${taskId}`)
}

export async function createCoverTask(rewriteResults: { uid: string; content: string }[]) {
  const res = await fetchApi<{ task_id: string }>('/api/publish/cover', {
    method: 'POST',
    body: JSON.stringify({ rewrite_results: rewriteResults }),
  })
  return res.task_id
}

export async function getCoverStatus(taskId: string) {
  return fetchApi<{
    task_id: string
    status: string
    plans: { uid: string; image_index: number; plan_text: string; html_code: string | null }[]
    error?: string
  }>(`/api/publish/cover/status/${taskId}`)
}

export async function confirmCoverAndGenerateHtml(
  taskId: string,
  confirmedPlans: { uid: string; image_index: number; plan_text: string }[]
) {
  return fetchApi<{ task_id: string; status: string; plans: unknown[] }>(
    '/api/publish/cover/html',
    {
      method: 'POST',
      body: JSON.stringify({
        task_id: taskId,
        confirmed_plans: confirmedPlans,
      }),
    }
  )
}

export async function getHtmlStatus(taskId: string) {
  return fetchApi<{
    task_id: string
    status: string
    plans: { uid: string; image_index: number; plan_text: string; html_code: string | null }[]
  }>(`/api/publish/cover/html/${taskId}`)
}

export async function publishItems(
  items: { account_uid: string; title: string; description: string; price: number; images: string[] }[]
) {
  return fetchApi<{ results: { uid: string; success: boolean; message: string }[] }>(
    '/api/publish/publish',
    {
      method: 'POST',
      body: JSON.stringify({ items }),
    }
  )
}
