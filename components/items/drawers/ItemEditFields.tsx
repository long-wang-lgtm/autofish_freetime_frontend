"use client"

import type { ItemEditMaterial } from "@/lib/api/items"
import { useItemEditMutators, type DraftUpdater } from "./useItemEditMutators"
import {
  DescSection,
  ImageSection,
  PriceSection,
  QuantitySection,
  AddressSection,
} from "./edit-sections/ItemEditBasicSections"
import {
  CategorySection,
  LabelSection,
  PostFeeSection,
  ProtocolSection,
  SkuSection,
} from "./edit-sections/ItemEditMetaSections"

interface ItemEditFieldsProps {
  draft: ItemEditMaterial
  setDraft: DraftUpdater
}

/**
 * 商品编辑字段区 —— 全部字段可编辑，改动直接落到 draft（即保存请求体）。
 *
 * 纯受控：自身不持有状态、不发请求；draft 的初始化和保存由 ItemEditModal 负责。
 *
 * 分组顺序按「买家能看到的」在前、「平台元数据」在后 —— 前五组决定商品长什么样，
 * 后五组（分类 / 类目 / 运费 / 服务标签 / 规格）是发布态参数，改错会影响能否上架，
 * 因此排在下方并各带说明。
 */
export function ItemEditFields({ draft, setDraft }: ItemEditFieldsProps) {
  const mutators = useItemEditMutators(setDraft)

  return (
    <div className="space-y-6">
      <DescSection draft={draft} mutators={mutators} />
      <ImageSection draft={draft} mutators={mutators} />
      <PriceSection draft={draft} mutators={mutators} />
      <QuantitySection draft={draft} mutators={mutators} />
      <AddressSection draft={draft} mutators={mutators} />
      <CategorySection draft={draft} mutators={mutators} />
      <LabelSection draft={draft} mutators={mutators} />
      <PostFeeSection draft={draft} mutators={mutators} />
      <ProtocolSection draft={draft} mutators={mutators} />
      <SkuSection draft={draft} mutators={mutators} />
    </div>
  )
}
