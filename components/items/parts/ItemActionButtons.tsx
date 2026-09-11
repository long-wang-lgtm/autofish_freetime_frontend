"use client"

import { useState } from "react"
import { Pencil, CircleDollarSign, Heart } from "lucide-react"
import type { ShopItem } from "@/lib/api/items"
import { RepricingDialog, type RepriceSubmit } from "./RepricingDialog"
import { FansPriceDialog, type FansPriceSubmit } from "./FansPriceDialog"

const BASE_CLASS = 'w-7 h-7 flex items-center justify-center rounded-lg transition-colors'

/**
 * 整列共用一套配色，与「上下架」列同色不同调的做法一致 —— 颜色标识的是操作组，
 * 而非单个按钮的语义。本列取蓝色（操作），与上下架列（绿）、删除（红）区分开。
 */
const ENABLED_CLASS =
  'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-950 dark:hover:bg-blue-900'

/** 保留同色但压暗，与可点击态形成对比（而非灰掉，见上）—— 未实现与不可用共用 */
const DISABLED_CLASS =
  'text-blue-600 bg-blue-50 opacity-50 dark:text-blue-400 dark:bg-blue-950 cursor-not-allowed'

interface ItemActionButtonsProps {
  item: ShopItem
  onEdit: () => void
  onReprice: (item: ShopItem, submit: RepriceSubmit) => Promise<void>
  onSetFansPrice: (item: ShopItem, submit: FansPriceSubmit) => Promise<void>
}

/**
 * 编辑 / 改价 / 粉丝价 行内操作按钮组，桌面表格与移动端卡片共用。
 *
 * 改价的可用性判断放在这里而不是两个调用点：同一个组件被桌面表格和移动卡片复用，
 * 判断只写一份就不会漂移（ShelfActions 曾经桌面/移动各写一份，改一处另一处照旧）。
 */
export function ItemActionButtons({ item, onEdit, onReprice, onSetFansPrice }: ItemActionButtonsProps) {
  const [repriceOpen, setRepriceOpen] = useState(false)
  const [fansPriceOpen, setFansPriceOpen] = useState(false)

  // 仅拦多规格：后端 Pro 接口对多规格直接 403，且列表价格显示为 "min~max" 无法作为预填值。
  // 其余「是否支持改价」（operates 字段）由后端判定，前端不预判。
  const multiSku = (item.skus?.length ?? 0) > 0

  // 粉丝价只有鱼小铺接口支持；非 Pro 账号后端直接 403，前端先置灰
  const isPro = item.account.isPro

  return (
    <div className="inline-flex items-center justify-center gap-1">
      <button
        type="button"
        aria-label="编辑"
        title="编辑"
        onClick={onEdit}
        className={`${BASE_CLASS} ${ENABLED_CLASS}`}
      >
        <Pencil className="w-4 h-4" />
      </button>

      <button
        type="button"
        disabled={multiSku}
        aria-label="改价"
        title={multiSku ? '暂不支持多规格商品调价' : '改价'}
        onClick={() => setRepriceOpen(true)}
        className={`${BASE_CLASS} ${multiSku ? DISABLED_CLASS : ENABLED_CLASS}`}
      >
        <CircleDollarSign className="w-4 h-4" />
      </button>

      <button
        type="button"
        disabled={!isPro}
        aria-label="粉丝价"
        title={isPro ? '粉丝价' : '非鱼小铺账号不支持设置粉丝价'}
        onClick={() => setFansPriceOpen(true)}
        className={`${BASE_CLASS} ${isPro ? ENABLED_CLASS : DISABLED_CLASS}`}
      >
        <Heart className="w-4 h-4" />
      </button>

      <RepricingDialog
        open={repriceOpen}
        item={item}
        onOpenChange={setRepriceOpen}
        onConfirm={onReprice}
      />

      <FansPriceDialog
        open={fansPriceOpen}
        item={item}
        onOpenChange={setFansPriceOpen}
        onConfirm={onSetFansPrice}
      />
    </div>
  )
}
