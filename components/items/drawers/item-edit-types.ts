import type {
  ItemEditMaterial,
  ItemEditImage,
  ItemEditSku,
  ItemEditLabel,
} from "@/lib/api/items"

// ── 样式常量 ──────────────────────────────────────────────────
// 所有控件同高同边框，避免各行自成一派
export const INPUT =
  "w-full h-10 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500"

export const TEXTAREA = `${INPUT} h-auto resize-vertical leading-relaxed`

export const LABEL = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"

/**
 * 服务标签码 → 中文名。仅用于展示，下发的仍是 serviceCode 原值；
 * 未收录的码（闲鱼会新增）回落显示原码，不隐藏也不猜。
 */
export const SERVICE_LABELS: Record<string, string> = {
  FAST_DELIVERY_24_HOUR: "24 小时内发货",
  FAST_DELIVERY_48_HOUR: "48 小时内发货",
  NONCONFORMITY_FREE_REFUND: "描述不符包退",
}

/** 数字输入共用：undefined / null / 空串一律渲染成空串，避免出现 "undefined" */
export const toNumberInput = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === "" ? "" : String(v)

/** 分 → 元，只读回显用。编辑一律在「分」上做，避免来回换算丢精度 */
export const centsToYuan = (cents: number | string | undefined) => {
  const n = Number(cents)
  if (!Number.isFinite(n)) return "-"
  return (n / 100).toFixed(2)
}

/**
 * 领域改写器集合。
 *
 * 字段区有 9 组、7 个子组件，若逐组下发各自的 patch 函数，props 会膨胀到十几个。
 * 这里把「怎么写回 draft」全部收进一个对象：子组件只取它需要的那几个方法，
 * 弹窗只负责把对象传下去。每个方法都是纯的、不可变的，不触碰请求。
 */
export interface ItemEditMutators {
  setDesc: (key: "desc" | "title", value: string) => void
  patchImage: (index: number, value: Partial<ItemEditImage>) => void
  removeImage: (index: number) => void
  patchPrice: (key: "priceInCent" | "origPriceInCent", value: string) => void
  setQuantity: (value: string) => void
  patchAddr: (key: keyof ItemEditMaterial["itemAddrDTO"], value: string) => void
  patchCat: (key: keyof ItemEditMaterial["itemCatDTO"], value: string) => void
  patchLabel: (index: number, key: keyof ItemEditLabel, value: string) => void
  patchPostFee: (key: keyof ItemEditMaterial["itemPostFeeDTO"], value: string | boolean) => void
  patchProtocol: (index: number, enable: boolean) => void
  patchSku: (index: number, key: keyof ItemEditSku, value: string) => void
}

/** 各字段分组共享的 props */
export interface ItemEditSectionProps {
  draft: ItemEditMaterial
  mutators: ItemEditMutators
}

/** 多规格时价格 / 库存改由 itemSkuList 承载，单规格字段需置灰 */
export const hasMultiSku = (draft: ItemEditMaterial) =>
  (draft.itemSkuList?.length ?? 0) > 0
