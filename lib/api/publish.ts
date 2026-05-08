/**
 * 商品发布 API 客户端 - AI创作相关接口
 */
import { fetchApi } from './accounts'

export async function createRewriteTask(description: string, accountUids: string[]) {
  const res = await fetchApi<{ task_id: string; record_id: number }>('/api/publish/rewrite', {
    method: 'POST',
    body: JSON.stringify({
      source_description: description,
      account_uids: accountUids,
    }),
  })
  return { taskId: res.task_id, recordId: res.record_id }
}

export async function getRewriteStatus(taskId: string) {
  return fetchApi<{
    task_id: string
    status: string
    progress: Record<string, string>
    results: { uid: string; content: string; error: string | null }[]
    record_id: number
  }>(`/api/publish/rewrite/status/${taskId}`)
}

// ========== 封面规划 API ==========

export async function createCoverPlanTask(
  rewriteTaskId: string,
  rewriteResults: { uid: string; content: string }[],
  recordId: number
) {
  const res = await fetchApi<{ task_id: string }>('/api/publish/cover-plan', {
    method: 'POST',
    body: JSON.stringify({
      rewrite_task_id: rewriteTaskId,
      rewrite_results: rewriteResults,
      record_id: recordId,
    }),
  })
  return res.task_id
}

export async function getCoverPlanStatus(taskId: string) {
  return fetchApi<{
    task_id: string
    status: string
    plans: {
      uid: string
      content: string
      style_id: string
      style_name: string
      plan_prompt: string
    }[]
  }>(`/api/publish/cover-plan/status/${taskId}`)
}

export async function confirmCoverPlan(
  taskId: string,
  confirmedPlans: { uid: string; plan_prompt: string }[],
  recordId: number
) {
  return fetchApi<{ task_id: string }>('/api/publish/cover-plan/confirm', {
    method: 'POST',
    body: JSON.stringify({
      task_id: taskId,
      confirmed_plans: confirmedPlans,
      record_id: recordId,
    }),
  })
}

// ========== 生图 API ==========

export async function getImageGenerateStatus(taskId: string) {
  return fetchApi<{
    task_id: string
    status: string
    images: {
      uid: string
      b64_image: string
      width?: number
      height?: number
      status: string
      error?: string
    }[]
  }>(`/api/publish/image-generate/status/${taskId}`)
}

// ========== 发布 API ==========

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

// ========== 历史记录 API ==========

export async function getPublishRecords() {
  return fetchApi<{
    records: {
      id: number
      source_description: string
      status: string
      account_count: number
      created_at: string
      updated_at: string
    }[]
  }>('/api/publish/records')
}

export async function getRecordDetail(recordId: number) {
  return fetchApi<{
    id: number
    source_description: string
    status: string
    account_count: number
    rewrite_results: { uid: string; content: string }[]
    cover_plans: {
      uid: string
      style_id: string
      style_name: string
      plan_prompt: string
    }[]
    images: { uid: string; b64_image: string; status: string }[]
    created_at: string
    updated_at: string
  }>(`/api/publish/records/${recordId}`)
}

export async function resumePublishRecord(recordId: number) {
  return fetchApi<{
    record_id: number
    status: string
    source_description: string
    rewrite_task_id: string
    cover_plan_task_id: string
    image_generate_task_id: string
  }>(`/api/publish/records/${recordId}/resume`, { method: 'POST' })
}

export async function deletePublishRecord(recordId: number) {
  return fetchApi<{ success: boolean }>(`/api/publish/records/${recordId}`, { method: 'DELETE' })
}