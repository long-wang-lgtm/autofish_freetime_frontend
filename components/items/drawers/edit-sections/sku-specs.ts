import type { ItemEditProperty, ItemEditSku } from "@/lib/api/items"

/** 最多两个规格维度 —— 与用户约定一致；更多维度的组合数会爆炸且闲鱼侧支持有限 */
export const MAX_SPECS = 2

/** 组合的身份分隔符：NUL，避免规格值自带空格时两个组合撞成同一个键 */
const KEY_SEP = "\u0000"

export interface SpecDimension {
  name: string
  values: string[]
}

/** 组合的身份：按规格值拼接，用于重算组合时找回已填的价格库存 */
export const skuKey = (propertyList: ItemEditSku["propertyList"]) =>
  propertyList.map((p) => p.valueText).join(KEY_SEP)

/** 从已有 SKU 反推规格维度：第 i 个属性名是第 i 个维度的名字，取值去重 */
export function deriveSpecs(skus: ItemEditSku[] | null | undefined): SpecDimension[] {
  const dims: SpecDimension[] = []
  for (const sku of skus ?? []) {
    sku.propertyList.forEach((p, i) => {
      if (!dims[i]) dims[i] = { name: p.propertyText, values: [] }
      if (!dims[i].values.includes(p.valueText)) dims[i].values.push(p.valueText)
    })
  }
  return dims.slice(0, MAX_SPECS)
}

/**
 * 规格值组合的笛卡尔积 —— 两个维度是 2×N，一个维度是 N。
 *
 * 已有的价格库存按组合身份对齐回填，所以改规格名、加一个规格值不会把已填的
 * 数字清零；找不到对应组合的新行留空，由用户填。
 */
export function buildSkuList(
  specs: SpecDimension[],
  existingSkus: ItemEditSku[]
): ItemEditSku[] {
  const existing = new Map<string, ItemEditSku>()
  for (const s of existingSkus) existing.set(skuKey(s.propertyList), s)

  const combos = specs.reduce<ItemEditSku["propertyList"][]>(
    (acc, spec) => {
      const next: ItemEditSku["propertyList"][] = []
      for (const combo of acc) {
        for (const value of spec.values) {
          next.push([...combo, { propertyText: spec.name, valueText: value }])
        }
      }
      return next
    },
    [[]]
  )

  return combos.map((propertyList) => {
    const prev = existing.get(skuKey(propertyList))
    return {
      priceInCent: prev?.priceInCent ?? "",
      quantity: prev?.quantity ?? "",
      propertyList,
    }
  })
}

/**
 * 规格维度 → itemProperties，必须与 buildSkuList 用同一份 specs 同时产出。
 *
 * 两者是同一件事的两个视角：itemProperties 说「有哪些规格名与规格值」，itemSkuList
 * 说「每个组合卖多少钱、还剩几件」。只写后者，请求体里就会同时带着新的组合表与旧的
 * 规格声明 —— 新增的规格值在 itemSkuList 里，却不在 itemProperties 里，闲鱼收到的是
 * 两份互相矛盾的数据。
 *
 * 不额外过滤空规格名：buildSkuList 不过滤，这里过滤就会让两边维度数对不上，
 * 一致性比"看起来干净"重要。
 */
export function buildItemProperties(specs: SpecDimension[]): ItemEditProperty[] {
  return specs.map((s) => ({
    propertyName: s.name,
    // 规格值配图：闲鱼支持，当前不启用，两个字段固定成不启用态
    supportImage: false,
    propertyValues: s.values.map((v) => ({
      propertyValue: v,
      propertyValueImg: null,
    })),
  }))
}
