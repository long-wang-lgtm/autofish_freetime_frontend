/**
 * 关键词规则 API 客户端
 */
import { getAuthHeader } from "./auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

// 预定义关键词
export const PREDEFINED_KEYWORDS = [
  { label: "首次回复", value: "first_reply" },
  { label: "我已拍下，待付款", value: "paid_not_sent" },
  { label: "我已小刀，待刀成", value: "discount_agreed" },
  { label: "我已付款，等待你发货", value: "paid_waiting_ship" },
  { label: "买家确认收货，交易成功", value: "order_completed" },
  { label: "我完成了评价", value: "review_submitted" },
]

// 预定义关键词值到标签的映射
export const PREDEFINED_KEYWORD_LABELS: Record<string, string> = {
  first_reply: "首次回复",
  paid_not_sent: "我已拍下，待付款",
  discount_agreed: "我已小刀，待刀成",
  paid_waiting_ship: "我已付款，等待你发货",
  order_completed: "买家确认收货，交易成功",
  review_submitted: "我完成了评价",
}

export interface KeywordRule {
  rule_id: string
  reply_type: "predefined" | "custom"
  keyword: string
  reply_content: string
  match_type: "exact" | "fuzzy" | "regex"
  priority: number
  enabled: boolean
  user_id: string
  linked_items: number
  linked_groups: number
  linked_item_list: LinkedItemInfo[]
  linked_group_list: LinkedGroupInfo[]
  created_at: string | null
  updated_at: string | null
}

export interface LinkedItemInfo {
  item_id: string
  title: string
  price: number
}

export interface LinkedGroupInfo {
  group_id: string
  group_name: string
}

export interface KeywordRuleCreate {
  reply_type?: "predefined" | "custom"
  keyword?: string
  reply_content: string
  match_type?: "exact" | "fuzzy" | "regex"
  priority?: number
  enabled?: boolean
}

export interface KeywordRuleUpdate {
  reply_type?: "predefined" | "custom"
  keyword?: string
  reply_content?: string
  match_type?: "exact" | "fuzzy" | "regex"
  priority?: number
  enabled?: boolean
}

export interface KeywordRuleListResponse {
  total: number
  rules: KeywordRule[]
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeader()

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "请求失败" }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export async function listKeywordRules(): Promise<KeywordRuleListResponse> {
  return fetchApi<KeywordRuleListResponse>("/api/keywords")
}

export async function getKeywordRule(rule_id: string): Promise<KeywordRule> {
  return fetchApi<KeywordRule>(`/api/keywords/${rule_id}`)
}

export async function createKeywordRule(data: KeywordRuleCreate): Promise<KeywordRule> {
  return fetchApi<KeywordRule>("/api/keywords", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateKeywordRule(
  rule_id: string,
  data: KeywordRuleUpdate
): Promise<KeywordRule> {
  return fetchApi<KeywordRule>(`/api/keywords/${rule_id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteKeywordRule(rule_id: string): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>(`/api/keywords/${rule_id}`, {
    method: "DELETE",
  })
}

export async function linkItemToRule(
  rule_id: string,
  item_id: string
): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>(
    `/api/keywords/${rule_id}/link-item`,
    {
      method: "POST",
      body: JSON.stringify({ item_id }),
    }
  )
}

export async function unlinkItemFromRule(
  rule_id: string,
  item_id: string
): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>(
    `/api/keywords/${rule_id}/unlink-item?item_id=${item_id}`,
    {
      method: "DELETE",
    }
  )
}

export async function linkGroupToRule(
  rule_id: string,
  group_id: string
): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>(
    `/api/keywords/${rule_id}/link-group`,
    {
      method: "POST",
      body: JSON.stringify({ group_id }),
    }
  )
}

export async function unlinkGroupFromRule(
  rule_id: string,
  group_id: string
): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>(
    `/api/keywords/${rule_id}/unlink-group?group_id=${group_id}`,
    {
      method: "DELETE",
    }
  )
}

export async function getRulesForItem(item_id: string): Promise<KeywordRuleListResponse> {
  return fetchApi<KeywordRuleListResponse>(`/api/keywords/items/${item_id}`)
}

// 规则页专用：轻量商品列表（仅 gid / title / price）
export interface RuleItem {
  gid: string
  title: string
  price: number
}

export async function listRuleItems(): Promise<RuleItem[]> {
  return fetchApi<RuleItem[]>("/api/keywords/items")
}

export async function listPredefinedKeywords(): Promise<{ keywords: { label: string; value: string }[] }> {
  return fetchApi<{ keywords: { label: string; value: string }[] }>("/api/keywords/predefined")
}

// 获取显示用的关键词
export function getDisplayKeyword(rule: KeywordRule): string {
  if (rule.reply_type === "predefined") {
    return PREDEFINED_KEYWORD_LABELS[rule.keyword] || rule.keyword
  }
  return rule.keyword
}
