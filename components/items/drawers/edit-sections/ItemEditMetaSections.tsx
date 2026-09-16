"use client"

import { Switch } from "@/components/ui/feedback/Switch"
import { SectionTitle, Hint } from "./Section"
import {
  INPUT,
  LABEL,
  SERVICE_LABELS,
  toNumberInput,
  hasMultiSku,
  type ItemEditSectionProps,
} from "../item-edit-types"

/**
 * 商品分类 —— 改分类必须同步改「商品类目」，两者指向同一套类目定义，
 * 只改一处会得到发布器拒绝的组合。页面上无法做关联校验，只给提示。
 */
export function CategorySection({ draft, mutators }: ItemEditSectionProps) {
  return (
    <section className="space-y-3">
      <SectionTitle>商品分类</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL} htmlFor="edit-cat-id">
            分类 ID
          </label>
          <input
            id="edit-cat-id"
            type="number"
            inputMode="numeric"
            value={toNumberInput(draft.itemCatDTO.catId)}
            onChange={(e) => mutators.patchCat("catId", e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-cat-name">
            分类名称
          </label>
          <input
            id="edit-cat-name"
            value={draft.itemCatDTO.catName}
            onChange={(e) => mutators.patchCat("catName", e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-channel-cat">
            渠道分类 ID
          </label>
          <input
            id="edit-channel-cat"
            type="number"
            inputMode="numeric"
            value={toNumberInput(draft.itemCatDTO.channelCatId)}
            onChange={(e) => mutators.patchCat("channelCatId", e.target.value)}
            className={INPUT}
          />
        </div>
      </div>
      <Hint>分类与下方「商品类目」必须指向同一套类目，改一处需同步改另一处。</Hint>
    </section>
  )
}

/**
 * 商品类目 —— 发布器要求的三元组。
 *
 * properties 是拼给发布器的串（`属性ID##属性名:值ID##值名`），与上面几个字段
 * 描述同一件事，所以两者会重复展示：这里不做自动同步 —— 猜错了会让商品发布到
 * 错误的类目下，宁可让改的人自己看到两处。
 */
export function LabelSection({ draft, mutators }: ItemEditSectionProps) {
  return (
    <section className="space-y-3">
      <SectionTitle>商品类目</SectionTitle>
      {draft.itemLabelExtList.length === 0 ? (
        <Hint>该商品没有类目属性。</Hint>
      ) : (
        draft.itemLabelExtList.map((label, i) => (
          <div
            key={`${label.propertyId}-${i}`}
            className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL} htmlFor={`label-cat-id-${i}`}>
                  类目 ID
                </label>
                <input
                  id={`label-cat-id-${i}`}
                  type="number"
                  inputMode="numeric"
                  value={toNumberInput(label.channelCateId)}
                  onChange={(e) => mutators.patchLabel(i, "channelCateId", e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor={`label-cat-name-${i}`}>
                  类目名称
                </label>
                <input
                  id={`label-cat-name-${i}`}
                  value={label.channelCateName ?? ""}
                  onChange={(e) => mutators.patchLabel(i, "channelCateName", e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor={`label-prop-name-${i}`}>
                  属性名
                </label>
                <input
                  id={`label-prop-name-${i}`}
                  value={label.propertyName}
                  onChange={(e) => mutators.patchLabel(i, "propertyName", e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor={`label-text-${i}`}>
                  展示文本
                </label>
                <input
                  id={`label-text-${i}`}
                  value={label.text}
                  onChange={(e) => mutators.patchLabel(i, "text", e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label className={LABEL} htmlFor={`label-props-${i}`}>
                发布串（properties）
              </label>
              <input
                id={`label-props-${i}`}
                value={label.properties}
                onChange={(e) => mutators.patchLabel(i, "properties", e.target.value)}
                className={`${INPUT} font-mono`}
              />
              <Hint>格式为 `属性ID##属性名:值ID##值名`，与上面几项描述同一件事。</Hint>
            </div>
          </div>
        ))
      )}
    </section>
  )
}

/** 运费 —— 运费金额仅在「需要运费」开启时有意义 */
export function PostFeeSection({ draft, mutators }: ItemEditSectionProps) {
  const fee = draft.itemPostFeeDTO

  return (
    <section className="space-y-3">
      <SectionTitle>运费</SectionTitle>
      <div className="space-y-3">
        <Switch
          checked={fee.supportFreight}
          onChange={(v) => mutators.patchPostFee("supportFreight", v)}
          label="需要运费"
        />
        <Switch
          checked={fee.canFreeShipping}
          onChange={(v) => mutators.patchPostFee("canFreeShipping", v)}
          label="支持包邮"
        />
        <Switch
          checked={fee.onlyTakeSelf}
          onChange={(v) => mutators.patchPostFee("onlyTakeSelf", v)}
          label="仅支持自提"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL} htmlFor="edit-post-price">
            运费（分）
          </label>
          <input
            id="edit-post-price"
            type="number"
            inputMode="numeric"
            value={toNumberInput(fee.postPriceInCent)}
            onChange={(e) => mutators.patchPostFee("postPriceInCent", e.target.value)}
            disabled={!fee.supportFreight}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-template-id">
            运费模板 ID
          </label>
          <input
            id="edit-template-id"
            type="number"
            inputMode="numeric"
            value={toNumberInput(fee.templateId)}
            onChange={(e) => mutators.patchPostFee("templateId", e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-idle-template-id">
            闲鱼运费模板 ID
          </label>
          <input
            id="edit-idle-template-id"
            type="number"
            inputMode="numeric"
            value={toNumberInput(fee.idleTemplateId)}
            onChange={(e) => mutators.patchPostFee("idleTemplateId", e.target.value)}
            className={INPUT}
          />
        </div>
      </div>
    </section>
  )
}

/** 服务标签 —— serviceCode 是稳定标识，展示名走字典，未知码回落到原码 */
export function ProtocolSection({ draft, mutators }: ItemEditSectionProps) {
  return (
    <section className="space-y-3">
      <SectionTitle>服务标签</SectionTitle>
      <div className="space-y-3">
        {draft.userRightsProtocols.map((p, i) => (
          <Switch
            key={p.serviceCode}
            checked={p.enable}
            onChange={(v) => mutators.patchProtocol(i, v)}
            label={SERVICE_LABELS[p.serviceCode] ?? p.serviceCode}
          />
        ))}
      </div>
    </section>
  )
}

/** 规格 —— 多规格商品的价格 / 库存在这里改，单规格时无需展示 */
export function SkuSection({ draft, mutators }: ItemEditSectionProps) {
  const multiSku = hasMultiSku(draft)

  return (
    <section className="space-y-3">
      <SectionTitle>规格</SectionTitle>
      {!multiSku ? (
        <Hint>单规格商品，无 SKU 列表（价格 / 库存见上方）。</Hint>
      ) : (
        <div className="space-y-3">
          {(draft.itemSkuList ?? []).map((sku, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div>
                <span className={LABEL}>规格</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-tight">
                  {sku.propertyList.map((v) => v.valueText).join(" / ") || "-"}
                </p>
              </div>
              <div>
                <label className={LABEL} htmlFor={`sku-price-${i}`}>
                  价格（分）
                </label>
                <input
                  id={`sku-price-${i}`}
                  type="number"
                  inputMode="numeric"
                  value={toNumberInput(sku.priceInCent)}
                  onChange={(e) => mutators.patchSku(i, "priceInCent", e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor={`sku-qty-${i}`}>
                  库存
                </label>
                <input
                  id={`sku-qty-${i}`}
                  type="number"
                  inputMode="numeric"
                  value={toNumberInput(sku.quantity)}
                  onChange={(e) => mutators.patchSku(i, "quantity", e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
