"use client"

import { X, ImagePlus } from "lucide-react"
import { useToast } from "@/components/ui/Toaster"
import { SectionTitle, Hint } from "./Section"
import {
  INPUT,
  TEXTAREA,
  LABEL,
  toNumberInput,
  centsToYuan,
  hasMultiSku,
  type ItemEditSectionProps,
} from "../item-edit-types"

/**
 * 商品描述 —— 只做 desc。
 *
 * 标题不单独开输入框：后端 ItemDesc 的校验器在**读回时**就把 title 覆盖成 desc
 * 全文（PublishItemEditDetail.py 的 validate_title），没有独立的短标题可取。
 * 保存时由 ItemEditModal 让 title 跟随 desc，避免下发一个与正文脱节的旧标题。
 */
export function DescSection({ draft, mutators }: ItemEditSectionProps) {
  return (
    <section className="space-y-3">
      <SectionTitle>商品描述</SectionTitle>
      <div>
        <label className={LABEL} htmlFor="edit-desc">
          描述正文
        </label>
        <textarea
          id="edit-desc"
          rows={8}
          value={draft.itemTextDTO.desc}
          onChange={(e) => mutators.setDesc("desc", e.target.value)}
          placeholder="商品描述"
          className={TEXTAREA}
        />
        <Hint>正文即商品详情，发布器同时用它作为标题。</Hint>
      </div>
    </section>
  )
}

/**
 * 商品图片 —— 新增走图片上传接口（未接入），删除和封面标记就地改 draft。
 */
export function ImageSection({ draft, mutators }: ItemEditSectionProps) {
  const { addToast } = useToast()

  return (
    <section className="space-y-3">
      <SectionTitle>商品图片</SectionTitle>
      <div className="flex flex-wrap items-center gap-3">
        {draft.imageInfoDOList.map((img, i) => (
          <div key={`${img.url}-${i}`} className="relative group flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.major ? "商品封面" : `商品图片 ${i + 1}`}
              loading="lazy"
              className="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
            />
            {img.major && (
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-black/60 text-white">
                封面
              </span>
            )}
            <button
              type="button"
              aria-label={`删除第 ${i + 1} 张图片`}
              title="删除"
              onClick={() => mutators.removeImage(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          aria-label="添加图片"
          title="添加图片"
          onClick={() => addToast({ title: "图片上传接口尚未接入", variant: "info" })}
          className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
        >
          <ImagePlus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </button>
      </div>
      <Hint>共 {draft.imageInfoDOList.length} 张，带「封面」标记的为封面图（major）。</Hint>
    </section>
  )
}

/**
 * 价格 —— 单位「分」。
 *
 * 不在元上编辑：后端 priceInCent 是整数，元/分来回换算会引入不可整除的尾数，
 * 输入框里显示 0.1 而下发 9 或 10 比直接让用户填整数更糟。旁边给只读的元换算。
 */
export function PriceSection({ draft, mutators }: ItemEditSectionProps) {
  const multiSku = hasMultiSku(draft)

  return (
    <section className="space-y-3">
      <SectionTitle>价格</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="edit-price">
            售价（分）
          </label>
          <input
            id="edit-price"
            type="number"
            inputMode="numeric"
            value={toNumberInput(draft.itemPriceDTO.priceInCent)}
            onChange={(e) => mutators.patchPrice("priceInCent", e.target.value)}
            disabled={multiSku}
            placeholder="0"
            className={INPUT}
          />
          {!multiSku && <Hint>= ¥{centsToYuan(draft.itemPriceDTO.priceInCent)}</Hint>}
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-orig-price">
            划线价（分）
          </label>
          <input
            id="edit-orig-price"
            type="number"
            inputMode="numeric"
            value={toNumberInput(draft.itemPriceDTO.origPriceInCent)}
            onChange={(e) => mutators.patchPrice("origPriceInCent", e.target.value)}
            disabled={multiSku}
            placeholder="0"
            className={INPUT}
          />
          {!multiSku && <Hint>= ¥{centsToYuan(draft.itemPriceDTO.origPriceInCent)}</Hint>}
        </div>
      </div>
      {multiSku && <Hint>多规格商品的价格在「规格」区按 SKU 设置，此处不生效。</Hint>}
    </section>
  )
}

/** 库存 —— 多规格商品由后端置为 1，库存改在 itemSkuList 上 */
export function QuantitySection({ draft, mutators }: ItemEditSectionProps) {
  const multiSku = hasMultiSku(draft)

  return (
    <section className="space-y-3">
      <SectionTitle>库存</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="edit-quantity">
            库存数量
          </label>
          <input
            id="edit-quantity"
            type="number"
            inputMode="numeric"
            value={toNumberInput(draft.quantity)}
            onChange={(e) => mutators.setQuantity(e.target.value)}
            disabled={multiSku}
            placeholder="0"
            className={INPUT}
          />
        </div>
      </div>
      <Hint>
        {multiSku
          ? "多规格商品库存见「规格」区，此字段被后端置为 1。"
          : "多规格商品的库存按 SKU 分别设置。"}
      </Hint>
    </section>
  )
}

/** 发布地址 —— 省市/区县与行政区划 ID 需相互对应，poiId 未在此暴露 */
export function AddressSection({ draft, mutators }: ItemEditSectionProps) {
  return (
    <section className="space-y-3">
      <SectionTitle>发布地址</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="edit-prov">
            省份
          </label>
          <input
            id="edit-prov"
            value={draft.itemAddrDTO.prov}
            onChange={(e) => mutators.patchAddr("prov", e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-city">
            城市
          </label>
          <input
            id="edit-city"
            value={draft.itemAddrDTO.city}
            onChange={(e) => mutators.patchAddr("city", e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-area">
            区县
          </label>
          <input
            id="edit-area"
            value={draft.itemAddrDTO.area}
            onChange={(e) => mutators.patchAddr("area", e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-division">
            行政区划 ID
          </label>
          <input
            id="edit-division"
            type="number"
            inputMode="numeric"
            value={toNumberInput(draft.itemAddrDTO.divisionId)}
            onChange={(e) => mutators.patchAddr("divisionId", e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-poi">
            定位点名称
          </label>
          <input
            id="edit-poi"
            value={draft.itemAddrDTO.poiName ?? ""}
            onChange={(e) => mutators.patchAddr("poiName", e.target.value)}
            placeholder="如：碧桂园剑桥郡"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-gps">
            经纬度
          </label>
          <input
            id="edit-gps"
            value={draft.itemAddrDTO.gps}
            onChange={(e) => mutators.patchAddr("gps", e.target.value)}
            placeholder="纬度,经度"
            className={INPUT}
          />
        </div>
      </div>
      <Hint>省 / 市 / 区与行政区划 ID 需相互对应；定位点 ID（poiId）未在此处暴露。</Hint>
    </section>
  )
}
