"use client"

import { X, ImagePlus } from "lucide-react"
import { useToast } from "@/components/ui/Toaster"
import { Select } from "@/components/ui/data/Select"
import { SectionTitle, Hint } from "./Section"
import { YuanPriceInput } from "./YuanPriceInput"
import { INPUT, TEXTAREA, LABEL, toNumberInput, type ItemEditSectionProps } from "../item-edit-types"

/**
 * 商品描述 —— 只做 desc。
 *
 * 标题不单独开输入框：后端 ItemDesc 的校验器在**读回时**就把 title 覆盖成 desc
 * 全文（PublishItemEditDetail.py 的 validate_title），没有独立的短标题可取。
 * 保存时由 ItemEditModal 让 title 跟随 desc，避免下发与正文脱节的旧标题。
 */
export function DescSection({ draft, mutators }: ItemEditSectionProps) {
  return (
    <section className="space-y-3">
      <SectionTitle>商品描述</SectionTitle>
      <div>
        {/* <label className={LABEL} htmlFor="edit-desc">
          描述正文
        </label> */}
        <textarea
          id="edit-desc"
          rows={8}
          value={draft.itemTextDTO.desc}
          onChange={(e) => mutators.setDesc("desc", e.target.value)}
          placeholder="商品描述"
          className={TEXTAREA}
        />
        {/* <Hint>正文即商品详情，发布器同时用它作为标题。</Hint> */}
      </div>
    </section>
  )
}

/** 商品图片 —— 新增走图片上传接口（未接入），删除与封面标记就地改 draft */
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
      {/* <Hint>共 {draft.imageInfoDOList.length} 张，带「封面」标记的为封面图（major）。</Hint> */}
    </section>
  )
}

/**
 * 价格与库存 —— 合在一行，且只在单规格时渲染。
 *
 * 两者是同一个决策的两面（卖多少钱、有多少件），分开两行会让改价时漏改库存，
 * 所以并排放在同一格。
 *
 * 价格对用户显示「元」，落到 draft 仍是「分」—— 后端字段就叫 priceInCent，
 * 换算只在输入框边界上发生一次，见 YuanPriceInput。输入框下方把分值写出来，
 * 省得对着 0.10 猜它到底是 10 分还是 10 元。
 *
 * 本区不判断规格：多规格商品根本不渲染它（由 ItemEditFields 决定），
 * 价格库存改由笛卡尔积表承载。数据不删除 —— 删光规格后这个区原样回来。
 */
export function PriceStockSection({ draft, mutators }: ItemEditSectionProps) {
  return (
    <section className="space-y-3">
      <SectionTitle>价格与库存</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL} htmlFor="edit-price">
            售价（元）
          </label>
          <YuanPriceInput
            id="edit-price"
            ariaLabel="售价"
            cents={draft.itemPriceDTO.priceInCent}
            onChange={(v) => mutators.patchPrice("priceInCent", v)}
          />
          {/* <Hint>下发 {toNumberInput(draft.itemPriceDTO.priceInCent) || 0} 分</Hint> */}
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-orig-price">
            划线价（元）
          </label>
          <YuanPriceInput
            id="edit-orig-price"
            ariaLabel="划线价"
            cents={draft.itemPriceDTO.origPriceInCent}
            onChange={(v) => mutators.patchPrice("origPriceInCent", v)}
          />
          {/* <Hint>下发 {toNumberInput(draft.itemPriceDTO.origPriceInCent) || 0} 分</Hint> */}
        </div>
        <div>
          <label className={LABEL} htmlFor="edit-quantity">
            库存
          </label>
          <input
            id="edit-quantity"
            type="number"
            inputMode="numeric"
            value={toNumberInput(draft.quantity)}
            onChange={(e) => mutators.setQuantity(e.target.value)}
            placeholder="0"
            className={INPUT}
          />
        </div>
      </div>
    </section>
  )
}

/**
 * 发布地址 —— 下拉选择，选项接口待接入。
 *
 * 现在可点开，但只有「当前地址」这一个选项。选中它不写回 draft：显示串是从
 * prov/city/area/poiName 拼出来的，反解不回 divisionId / gps / poiId，真去回写
 * 等于拿一个拼出来的字符串覆盖掉结构化的地址。区划数据到位后，从这里按选中的
 * 行政区划回写这几个字段即可。
 */
export function AddressSection({ draft }: ItemEditSectionProps) {
  const { prov, city, area, poiName } = draft.itemAddrDTO
  const label = [prov, city, area].filter(Boolean).join(" ")
  const display = poiName ? `${label} · ${poiName}` : label

  return (
    <section className="space-y-3">
      <SectionTitle>发布地址</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          {/* <label className={LABEL} htmlFor="edit-addr">
            所在地
          </label> */}
          <Select
            id="edit-addr"
            value={display}
            onChange={() => {}}
            options={display ? [{ value: display, label: display }] : []}
            // 有地址时不给占位项：占位项会变成下拉里第二个可选项，点它没有任何反应
            placeholder={display ? undefined : "暂无地址"}
          />
          {/* <Hint>地址选项接口待接入，当前仅展示；经纬度与行政区划 ID 原样保留。</Hint> */}
        </div>
      </div>
    </section>
  )
}
