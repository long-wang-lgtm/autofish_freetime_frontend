import type { ItemFans, ShipConfig, ShopItem, ShipByVoucher } from "@/lib/api/items"

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

/** 判断单个 ShipByVoucher 是否有效：无卡看使用说明，卡密看卡种ID */
export function isShipByVoucherValid(cfg: ShipByVoucher | null | undefined): boolean {
  if (!cfg) return false
  if (cfg.kind === 'VOUCHER') return cfg.voucherkindid != null
  return (cfg.useinstructions?.trim().length ?? 0) > 0
}

/** 判断 ShipConfig 是否有配置 */
export function hasShipConfig(config: ShipConfig | null | undefined): boolean {
  if (!config) return false
  if (config.byEntirety === null) return false
  if (config.byEntirety === true) return isShipByVoucherValid(config.entirety)
  return Object.values(config.skus).some((cfg) => isShipByVoucherValid(cfg))
}

/** 获取 SKU 的配置（从 config.skus 中查找） */
export function getSkuConfig(config: ShipConfig, skuid: number): ShipByVoucher | null {
  return config.skus[skuid] ?? null
}

/** SKU 明细表行数据（用于 ShipConfigModal 内嵌的 SKU 选择表） */
export interface SkuSummary {
  skuid: number
  values: string          // 规格值拼接，如 "红色 / XL"
  price: number | null    // 单位：分
  hasConfig: boolean
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

/**
 * 库存显示值 —— 桌面表格与移动卡片共用，避免两处各写一份判断而漂移。
 *
 * 鱼小铺（Pro）账号后端会同步闲鱼上的真实库存；普通账号调价走 /edit.price.by.idle，
 * 那个接口只改价格、库存不由本系统维护，后端字段停在 0，把 0 当"已售罄"展示是误导，
 * 所以固定显示 1。返回 null 表示 Pro 账号但库存尚未同步到。
 */
export function displayQuantity(item: ShopItem): number | null {
  if (!item.account.isPro) return 1
  return item.quantity ?? null
}

// ═══════════════════════════════════════════════════════════════
// 粉丝价
// ═══════════════════════════════════════════════════════════════

/**
 * 粉丝价三档的固定顺序与标题。
 * 标题必须与闲鱼返回的 fans[].title 完全一致（后端 set_fans_price 的 all/old/buy 三档），
 * 对不上就不显示，不做「按顺序硬套」的兜底 —— 顺序套错比空着更糟。
 */
export const FANS_GROUPS: { key: 'all' | 'old' | 'buy'; title: string }[] = [
  { key: 'all', title: '全部粉丝价' },
  { key: 'old', title: '老粉价' },
  { key: 'buy', title: '已购粉价' },
]

/** 读取 fans 分组 —— 兼容 { root: [...] } 与裸数组两种序列化形态 */
export function getFansGroups(fans: ShopItem['fans']): ItemFans[] {
  if (!fans) return []
  return Array.isArray(fans) ? fans : (fans.root ?? [])
}

/** 按固定三档顺序取粉丝价，缺失为 null（表格渲染成 -） */
export function fansPrices(item: ShopItem): (number | null)[] {
  const groups = getFansGroups(item.fans)
  return FANS_GROUPS.map(({ title }) => groups.find((g) => g.title === title)?.price ?? null)
}

/**
 * 商品现价（元）—— 单规格读 reservePrice；多规格的 reservePrice 是 "min~max" 解析不出数字，
 * 退回各 SKU 的最低价（保守取值，保证粉丝价低于任一规格）。都取不到返回 null。
 */
export function itemPrice(item: ShopItem): number | null {
  if (item.skus?.length) {
    const prices = item.skus.map((s) => s.price / 100).filter((p) => Number.isFinite(p))
    return prices.length ? Math.min(...prices) : null
  }
  const price = Number(item.reservePrice)
  return Number.isFinite(price) ? price : null
}

/** 商品状态标签 */
/** 商品软删除状态（后端 delete_item 会把 status 置为该值） */
export const ITEM_STATUS_DELETED = -100

export function statusLabel(status: number): { text: string; color: string } {
  switch (status) {
    case 0:
      return { text: "在售", color: "bg-green-100 text-green-700" }
    case -2:
      return { text: "已下架", color: "bg-gray-100 text-gray-500" }
    case 1:
      return { text: "已售出", color: "bg-red-100 text-red-600" }
    case -9:
      return { text: "审核中", color: "bg-red-100 text-red-600" }
    case ITEM_STATUS_DELETED:
      return { text: "已删除", color: "bg-gray-100 text-gray-400" }
    default:
      return { text: "未知", color: "bg-gray-100 text-gray-500" }
  }
}
