"use client"

import { Pencil, CircleDollarSign, Heart } from "lucide-react"

/** 改价 / 粉丝价 —— 目前为占位按钮，尚未接入 API */
const PLACEHOLDER_ACTIONS = [
  { key: 'repricing', label: '改价', Icon: CircleDollarSign },
  { key: 'fansPrice', label: '粉丝价', Icon: Heart },
]

const BASE_CLASS = 'w-7 h-7 flex items-center justify-center rounded-lg transition-colors'

/**
 * 整列共用一套配色，与「上下架」列同色不同调的做法一致 —— 颜色标识的是操作组，
 * 而非单个按钮的语义。本列取蓝色（操作），与上下架列（绿）、删除（红）区分开。
 */
const ENABLED_CLASS =
  'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-950 dark:hover:bg-blue-900'

/** 占位按钮保留同色但压暗，与可点击态形成对比（而非灰掉，见上） */
const DISABLED_CLASS =
  'text-blue-600 bg-blue-50 opacity-50 dark:text-blue-400 dark:bg-blue-950 cursor-not-allowed'

interface ItemActionButtonsProps {
  onEdit: () => void
}

/** 编辑 / 改价 / 粉丝价 行内操作按钮组，桌面表格与移动端卡片共用 */
export function ItemActionButtons({ onEdit }: ItemActionButtonsProps) {
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

      {PLACEHOLDER_ACTIONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          disabled
          aria-label={label}
          title={`${label}（待实现）`}
          className={`${BASE_CLASS} ${DISABLED_CLASS}`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}
