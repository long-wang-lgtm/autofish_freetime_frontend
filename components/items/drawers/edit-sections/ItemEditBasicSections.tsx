"use client"

import { useRef, useState } from "react"
import { X, ImagePlus } from "lucide-react"
import { useToast } from "@/components/ui/Toaster"
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner"
import { Select } from "@/components/ui/data/Select"
import { ImageLightbox } from "@/components/ui/overlay/ImageLightbox"
import { uploadFileToFlare } from "@/lib/api/upload"
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

/** 闲鱼侧商品图片张数上限 —— 与素材图（8 张）是两套业务，各自定义 */
const MAX_IMAGES = 9

/** 上传前置校验，取 .claude/rules/frontend-form.md 的阈值 */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * 图片宽高。
 *
 * 优先用闲鱼返回的 pix（"800x800"）—— 它描述的一定是闲鱼侧真正存下的那张图。
 * 拿不到 pix 才退回前端加载一次读自然尺寸：pix 来自 UploadImage，虽然后端声明它是
 * 必填，但这里读到的是 JSONField 反序列化出来的东西，不该替后端担保字段齐全。
 * 两条都拿不到就给空串：后端 ImageInfo 的 widthSize / heightSize 声明为 int | str，
 * 容得下空值，比瞎填一个数字安全。
 */
function resolveImageSize(
  url: string,
  pix?: string
): Promise<[number | string, number | string]> {
  const [w, h] = pix ? pix.split("x").map(Number) : []
  // NaN 与 0 都为假，一并落到下面的兜底
  if (w && h) return Promise.resolve([w, h])

  return new Promise((resolve) => {
    const probe = new Image()
    probe.onload = () => resolve([probe.naturalWidth, probe.naturalHeight])
    probe.onerror = () => resolve(["", ""])
    probe.src = url
  })
}

interface ImageSectionProps extends ItemEditSectionProps {
  /** 图片要传到这个账号的闲鱼 CDN —— 后端 complete 接口的 uid 没有默认值，不传直接 422 */
  accountUid: string
}

/**
 * 商品图片 —— 新增走图片上传接口，删除与封面标记就地改 draft。
 *
 * 上传成功后只写 draft，不即时落库：弹窗的模型是「改动落在副本，提交时整包下发」，
 * 在这里顺手存一次会让「取消」「恢复原值」两个按钮失去意义。
 *
 * 与批量发布页的 MaterialImageCell 有两处刻意不同：
 * - 上传失败要 toast。那边 catch 空的写法，会让人对着一个没反应的按钮干等
 * - 落点账号 uid 是必传项，不是可选
 */
export function ImageSection({ draft, mutators, accountUid }: ImageSectionProps) {
  const { addToast } = useToast()
  // 预览哪张：存地址而不是下标，删图导致的下标漂移就不会指错图
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canAdd = draft.imageInfoDOList.length < MAX_IMAGES

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 拿到 File 对象后立刻清空：不清的话连着选同一个文件不会再触发 change。
    // 放在这里而不是 finally —— 格式不符、超限这些提前返回的分支也走得到
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      addToast({
        title: "图片格式不支持",
        description: "仅支持 JPG、PNG、WebP",
        variant: "error",
      })
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      addToast({ title: "图片过大", description: "单张不能超过 10MB", variant: "error" })
      return
    }

    setUploading(true)
    try {
      const uploaded = await uploadFileToFlare(file, accountUid)
      // 闲鱼地址在 cdn 这一层；外层那个 md5 是素材图要的，商品图用不上
      const url = uploaded.cdn?.url
      if (!url) throw new Error("上传结果里没有图片地址")

      const [widthSize, heightSize] = await resolveImageSize(url, uploaded.cdn?.pix)

      mutators.addImage({
        url,
        widthSize,
        heightSize,
        // 封面归属由 addImage 判定，这里给的值会被覆盖
        major: false,
        labels: [],
        isQrCode: false,
        type: 0,
        status: "done",
        extraInfo: { isH: false, isT: false, raw: false },
      })
    } catch (err) {
      addToast({
        title: "图片上传失败",
        // 后端 detail 经 fetchApi 变成了 Error.message，原样透出
        description: err instanceof Error ? err.message : String(err),
        variant: "error",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="space-y-3">
      <SectionTitle>商品图片</SectionTitle>
      <div className="flex flex-wrap items-center gap-3">
        {draft.imageInfoDOList.map((img, i) => {
          const alt = img.major ? "商品封面" : `商品图片 ${i + 1}`
          return (
            <div key={`${img.url}-${i}`} className="relative group flex-shrink-0">
              {/* 缩略图用 button 包着：点击放大是这里的主要动作，键盘也该能触发 */}
              <button
                type="button"
                onClick={() => setPreviewSrc(img.url)}
                aria-label={`放大查看${alt}`}
                className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={alt}
                  loading="lazy"
                  className="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                />
              </button>
              {img.major && (
                // 标记压在缩略图上，点击要穿透到下面的 button
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-black/60 text-white pointer-events-none">
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
          )
        })}

        {/* 满 9 张后不再上传：入口整个不渲染，不给点出错的余地 */}
        {canAdd && (
          <>
            <button
              type="button"
              aria-label="添加图片"
              title="添加图片"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <ImagePlus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              )}
            </button>
            {/* accept 与上面的白名单保持一致，让文件选择器先把不合格的挡掉；
                真正的判定仍在 handleFile 里，accept 只是用户的便利，不是校验 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="hidden"
            />
          </>
        )}
      </div>

      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />

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
