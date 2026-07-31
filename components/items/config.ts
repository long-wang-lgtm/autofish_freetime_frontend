import type { ShipConfig, ShipByVoucher } from "@/lib/api/items"

// ═══════════════════════════════════════════════════════════════
// 配置字段类型
// ═══════════════════════════════════════════════════════════════

/** ShipConfig 的三个 stage */
export type ShipStage = 'shipment' | 'shipconfirm' | 'evaluation'

/** 弹窗可编辑的字段（ShipConfig 三字段 + 保留的文本字段） */
export type ConfigField = ShipStage | 'ai_reply_item_prompt' | 'sendCode'

export const FIELD_LABELS: Record<ConfigField, string> = {
  shipment: "付款后发货",
  shipconfirm: "收货后赠送",
  evaluation: "评价后赠送",
  ai_reply_item_prompt: "AI系统提示词",
  sendCode: "指令码",
}

export const STAGE_LABELS: Record<ShipStage, string> = {
  shipment: "付款后发货",
  shipconfirm: "收货后赠送",
  evaluation: "评价后赠送",
}

// ═══════════════════════════════════════════════════════════════
// 占位符
// ═══════════════════════════════════════════════════════════════

export const PLACEHOLDERS: { label: string; value: string }[] = [
  { label: "分段符", value: "{分段符}" },
  // 后续按需扩展：
  // { label: "订单号", value: "{订单号}" },
  // { label: "卡券信息", value: "{卡券信息}" },
]

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

/** 判断 ShipConfig 是否有配置 */
export function hasShipConfig(config: ShipConfig | null | undefined): boolean {
  if (!config) return false
  if (config.byEntirety === null) return false
  if (config.byEntirety === true) return config.entirety !== null
  return Object.keys(config.skus).length > 0
}

/** 获取 SKU 的配置（从 config.skus 中查找） */
export function getSkuConfig(config: ShipConfig, skuid: number): ShipByVoucher | null {
  return config.skus[skuid] ?? null
}

/** 格式化发布时间 — ISO 8601 字符串 → yyyy/MM/dd HH:mm */
export function formatPublishTime(isoString: string | null): string {
  if (!isoString) return "-"
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return "-"
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** 商品状态标签 */
export function statusLabel(status: number): { text: string; color: string } {
  switch (status) {
    case 0:
      return { text: "在售", color: "bg-green-100 text-green-700" }
    case -2:
      return { text: "已下架", color: "bg-gray-100 text-gray-500" }
    case 1:
      return { text: "已售出", color: "bg-red-100 text-red-600" }
    default:
      return { text: "未知", color: "bg-gray-100 text-gray-500" }
  }
}
