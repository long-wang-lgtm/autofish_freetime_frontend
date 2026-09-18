"use client"

import { useState } from "react"
import type { ItemEditMaterial } from "@/lib/api/items"
import { useItemEditMutators, type DraftUpdater } from "./useItemEditMutators"
import {
  ImageSection,
  DescSection,
  PriceStockSection,
  AddressSection,
} from "./edit-sections/ItemEditBasicSections"
import { SkuSection } from "./edit-sections/ItemEditSkuSection"
import {
  CategorySection,
  PostFeeSection,
  ProtocolSection,
} from "./edit-sections/ItemEditMetaSections"
import { deriveSpecs, type SpecDimension } from "./edit-sections/sku-specs"
import { hasMultiSku } from "./item-edit-types"

interface ItemEditFieldsProps {
  draft: ItemEditMaterial
  setDraft: DraftUpdater
  /** 商品所属账号 —— 只给图片上传用（后端靠它把图传到该账号的闲鱼 CDN） */
  accountUid: string
}

export function ItemEditFields({ draft, setDraft, accountUid }: ItemEditFieldsProps) {
  const mutators = useItemEditMutators(setDraft)

  // 只在挂载时从数据推导一次：组件是在拿到 draft 之后才挂载的，此刻数据已就绪
  const [specs, setSpecs] = useState<SpecDimension[]>(() => deriveSpecs(draft.itemSkuList))

  // 有规格维度、或有既有的 SKU 列表 → 价格库存交给笛卡尔积表。
  // 删光规格后这个条件不成立，单规格的价格与库存原样回来（数据从未被删过）
  const multiSku = specs.length > 0 || hasMultiSku(draft)

  return (
    <div className="space-y-6">
      <ImageSection draft={draft} mutators={mutators} accountUid={accountUid} />
      <DescSection draft={draft} mutators={mutators} />
      <SkuSection
        draft={draft}
        mutators={mutators}
        specs={specs}
        onSpecsChange={setSpecs}
      />
      {!multiSku && <PriceStockSection draft={draft} mutators={mutators} />}
      <CategorySection draft={draft} mutators={mutators} />
      <AddressSection draft={draft} mutators={mutators} />
      <PostFeeSection draft={draft} mutators={mutators} />
      <ProtocolSection draft={draft} mutators={mutators} />
    </div>
  )
}
