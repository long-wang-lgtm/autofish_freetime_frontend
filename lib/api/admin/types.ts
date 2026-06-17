/**
 * 管理员 API — 共享类型定义
 *
 * 匹配后端 free/common/schema.py 中的 Schema 结构。
 * 仅包含被三个及以上模块引用的跨模块类型。
 */
export type { OperationResponse } from '@/lib/utils/api'

// ===== 用户 =====

/** 匹配 UserSimpleSchema */
export interface UserSimple {
  userId: string | null
  username: string | null
}

// ===== 代理 =====

/** 匹配 ProxyLongSchema */
export interface ProxyLong {
  id: number | null
  server: string | null
  username: string | null
  password: string | null
  direction: boolean | null
  source: string | null
  status: string | null
  created_at: string | null
  updated_at: string | null
  user: UserSimple | null
  accountCount: number | null
}

// ===== 账号 =====

/** 匹配 AccountNameSchema */
export interface AccountName {
  uid: string | null
  name: string | null
  status: number | null
  isPro: boolean | null
}

/** 匹配 AccountSchema（列表中每条记录的完整字段） */
export interface AccountFull {
  uid: string | null
  name: string | null
  status: number | null
  itemtotalCounts: number | null
  onsaleitemCount: number | null
  reply_pause_seconds: number | null
  auto_reply: boolean | null
  ai_auto_reply: boolean | null
  auto_delivery: boolean | null
  auto_notify: boolean | null
  auto_free: boolean | null
  auto_positive_review: boolean | null
  full_auto_shine: boolean | null
  full_deliveryContent: string | null
  full_receiptAfter: string | null
  full_positiveReviewAfter: string | null
  full_default_reply_content: string | null
  full_ai_reply_system_prompt: string | null
  user: UserSimple | null
  proxy: ProxyLong | null
}

/** 账号列表 + IM 状态响应（匹配 AccountStatusListSchema，List 的 root 由后端自动展开） */
export interface AccountStatusListResponse {
  total: number
  accounts: AccountFull[]
  statuslist: Record<string, boolean>
}
