/**
 * 关键词回复规则 API 客户端
 *
 * 后端端点源: backend/free/user/replyrule.py
 * 数据模型源: backend/free/schema/fish.py (ReplyItemRuleSchema)
 * 所有字段命名对齐后端 camelCase schema
 */
import { fetchApi } from "@/lib/utils/api"

// ==================== 实体类型 ====================

/** 关键词回复规则 — 对应后端 ReplyItemRuleSchema */
export interface ReplyRule {
  id: number
  keyword: string[]
  keyType: "predefined" | "custom"
  matchType: "exact" | "fuzzy" | "regex"
  replyContent: string
  priority: number
  enabled: boolean
  fullShop: boolean
  itemsCount: number
  create_at: string | null
  update_at: string | null
}

/** 规则列表响应 */
export interface ReplyRuleListResponse {
  total: number
  rules: ReplyRule[]
}

/** 可绑定到规则的商品 — 对应后端 ShopItemSchema，由 bindable.items 返回 */
export interface BindableItem {
  gid: number
  title: string | null
  reservePrice: string | null
  status: number
  picurl: string | null
}

// ==================== 入参类型 ====================

/** 规则列表查询参数 */
export interface ReplyRuleListParams {
  page?: number
  size?: number
  keyword?: string
  enabled?: boolean
  fullShop?: boolean
  order_by?: "priority" | "enabled" | "fullShop" | "create_at" | "update_at"
  asc?: boolean
}

/** 创建规则入参 */
export interface ReplyRuleCreate {
  keyword: string[]
  keyType: "predefined" | "custom"
  matchType: "exact" | "fuzzy" | "regex"
  replyContent: string
  priority?: number
  enabled?: boolean
  fullShop?: boolean
  gids?: string[]
}

/** 更新规则入参 */
export interface ReplyRuleUpdate {
  keyword?: string[]
  keyType?: "predefined" | "custom"
  matchType?: "exact" | "fuzzy" | "regex"
  replyContent?: string
  priority?: number
  enabled?: boolean
  fullShop?: boolean
}

/** 通用操作结果 — 对应后端 OperationResponse */
export interface OperationResult {
  success: boolean
  message: string
}

// ==================== API 函数 ====================

/** 获取预定义关键词字典 { key: label } */
export async function fetchPredefinedKeywords(): Promise<Record<string, string>> {
  return fetchApi<Record<string, string>>("/api/keywords/predefined")
}

/** 分页查询规则列表 */
export async function fetchReplyRules(
  params: ReplyRuleListParams = {}
): Promise<ReplyRuleListResponse> {
  return fetchApi<ReplyRuleListResponse>("/api/keywords", { params })
}

/** 创建规则（可同时绑定商品） */
export async function createReplyRule(data: ReplyRuleCreate): Promise<ReplyRule> {
  return fetchApi<ReplyRule>("/api/keywords", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

/** 更新规则 */
export async function updateReplyRule(
  id: number,
  data: ReplyRuleUpdate
): Promise<ReplyRule> {
  return fetchApi<ReplyRule>(`/api/keywords?rid=${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

/** 删除规则 */
export async function deleteReplyRule(id: number): Promise<OperationResult> {
  return fetchApi<OperationResult>(`/api/keywords/?rid=${id}`, { method: "DELETE" })
}

/** 获取可绑定的商品列表 */
export async function fetchBindableItems(): Promise<BindableItem[]> {
  return fetchApi<BindableItem[]>("/api/keywords/bindable.items", { method: "POST" })
}

/** 获取可绑定的规则列表 */
export async function fetchBindableRules(): Promise<ReplyRule[]> {
  return fetchApi<ReplyRule[]>("/api/keywords/bindable.rules", { method: "POST" })
}

/** 获取规则已关联的商品列表（惰性加载 — 仅展开时调用） */
export async function fetchRuleItems(rid: number): Promise<BindableItem[]> {
  return fetchApi<BindableItem[]>(`/api/keywords/rule.items?rid=${rid}`)
}

/** 获取商品已关联的规则列表 */
export async function fetchItemRules(gid: string): Promise<ReplyRule[]> {
  return fetchApi<ReplyRule[]>(`/api/keywords/item.rules?gid=${gid}`)
}

// ==================== 关联操作（批量） ====================

/** 绑定商品到规则 */
export async function bindRuleItems(
  rid: number,
  gids: string[]
): Promise<OperationResult> {
  return fetchApi<OperationResult>(`/api/keywords/bind.rule.items?rid=${rid}`, {
    method: "POST",
    body: JSON.stringify({ gids }),
  })
}

/** 绑定规则到商品 */
export async function bindItemRules(
  gid: string,
  rids: number[]
): Promise<OperationResult> {
  return fetchApi<OperationResult>(`/api/keywords/bind.item.rules?gid=${gid}`, {
    method: "POST",
    body: JSON.stringify({ rids }),
  })
}

/** 解绑商品与规则 */
export async function unbindRuleItems(
  rid: number,
  gids: string[]
): Promise<OperationResult> {
  return fetchApi<OperationResult>(`/api/keywords/unbind.rule.items?rid=${rid}`, {
    method: "POST",
    body: JSON.stringify({ gids }),
  })
}

/** 解绑规则与商品 */
export async function unbindItemRules(
  gid: string,
  rids: number[]
): Promise<OperationResult> {
  return fetchApi<OperationResult>(`/api/keywords/unbind.item.rules?gid=${gid}`, {
    method: "POST",
    body: JSON.stringify({ rids }),
  })
}

// ==================== keyword 转换工具 ====================

/**
 * 将规则的关键词数组转为展示/编辑用的字符串。
 * - 预定义类型：通过字典 key → 中文标签
 * - 自定义类型：全角逗号拼接
 */
export function formatRuleKeyword(
  rule: ReplyRule,
  labels: Record<string, string>
): string {
  if (rule.keyType === "predefined") {
    if (rule.keyword.length > 0) {
      return labels[rule.keyword[0]] || rule.keyword[0]
    }
    return ""
  }
  return rule.keyword.join("，")
}

/**
 * 将用户输入的逗号分隔字符串拆分为关键词数组。
 * 支持半角逗号 (,)、全角逗号 (，)，trim 空白，过滤空串。
 * 结果去重保持顺序。
 */
export function parseKeywordInput(input: string): string[] {
  const parts = input
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set(parts)]
}
