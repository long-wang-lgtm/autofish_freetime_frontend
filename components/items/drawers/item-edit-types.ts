import type { ItemEditMaterial, ItemEditImage, ItemEditSku } from "@/lib/api/items"

// ── 样式常量 ──────────────────────────────────────────────────
// 所有控件同高同边框，避免各行自成一派
/**
 * 控件基础样式 —— 不含宽度。
 *
 * 宽度必须和使用处分开：Tailwind 把 `.w-full` 排在 `.w-28` 之后，同一个元素上
 * 写 `` `${INPUT} w-28` `` 赢的是 `w-full`，定宽根本不生效 —— 行内的小输入框
 * 会被撑满整行，把同行的其它字段挤到下一行去。
 * 所以撑满容器的用 INPUT，自己定宽的用 CONTROL。
 */
export const CONTROL =
  "h-10 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500"

/** 撑满容器的输入框 */
export const INPUT = `w-full ${CONTROL}`

export const TEXTAREA = `${INPUT} h-auto resize-vertical leading-relaxed`

export const LABEL = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"

/**
 * 服务标签码 → 中文名。仅用于展示，下发的仍是 serviceCode 原值；
 * 未收录的码（闲鱼会新增）回落显示原码，不隐藏也不猜。
 */
export const SERVICE_LABELS: Record<string, string> = {
  FAST_DELIVERY_24_HOUR: "24 小时内发货",
  FAST_DELIVERY_48_HOUR: "48 小时内发货",
  NONCONFORMITY_FREE_REFUND: "描述不符包邮退",
}

/** 数字输入共用：undefined / null / 空串一律渲染成空串，避免出现 "undefined" */
export const toNumberInput = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === "" ? "" : String(v)

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
  /**
   * 追加一张图片。
   *
   * 封面标记由这里定，不看调用方传了什么：列表原本为空时，新图即封面。这样
   * 「列表非空就一定有封面」这条不变式只存在于一处，上传处不必知道封面规则。
   */
  addImage: (img: ItemEditImage) => void
  /** 删图 —— 删掉的若是封面，第一张自动补位，理由见实现处注释 */
  removeImage: (index: number) => void
  patchPrice: (key: "priceInCent" | "origPriceInCent", value: string) => void
  setQuantity: (value: string) => void
  /** 改类目 —— 同时回写 itemCatDTO 与 itemLabelExtList，见实现处注释 */
  setChannelCate: (channelCateId: number | string, channelCateName: string) => void
  patchPostFee: (key: keyof ItemEditMaterial["itemPostFeeDTO"], value: string | boolean) => void
  patchProtocol: (index: number, enable: boolean) => void
  /**
   * 整包替换 SKU 列表 + 规格声明 —— 规格组合重算后行数与身份都变了，逐行 patch
   * 无从下手。两件事同一份 specs 产出，所以只给这一个方法，见实现处注释。
   *
   * properties 的类型直接取物料上那个字段：它可能整个缺省（undefined），
   * 恢复原值时原样写回、由 JSON.stringify 略过，才能与基线逐字节一致。
   */
  setSkuList: (skus: ItemEditSku[] | null, properties: ItemEditMaterial["itemProperties"]) => void
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
