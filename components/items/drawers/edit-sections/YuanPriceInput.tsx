"use client"

import { useEffect, useState } from "react"
import { INPUT } from "../item-edit-types"

/** 元文本 → 分。空串、非数字一律归为 null（= 未填写），不猜用户想填 0 */
function centsOf(text: string): number | null {
  if (text.trim() === "") return null
  const n = Number(text)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

/**
 * 分 → 元文本，固定两位小数。
 *
 * 价格是钱，两位小数是它的书写规范：`0.10` 与 `0.1` 数值相同，但前者一眼能看出
 * 量级，后者容易被读成 0 或者少看一位。
 */
function yuanOf(cents: number | string | null | undefined): string {
  if (cents === null || cents === undefined || cents === "") return ""
  const n = Number(cents)
  return Number.isFinite(n) ? (n / 100).toFixed(2) : ""
}

/** 把来自 draft 的分值规格化成整数分，用于和输入文本比较 */
function normalize(cents: number | string | null | undefined): number | null {
  if (cents === null || cents === undefined || cents === "") return null
  const n = Number(cents)
  return Number.isFinite(n) ? Math.round(n) : null
}

interface YuanPriceInputProps {
  id?: string
  /** 无障碍名；表格里没有可见 label 时用它 */
  ariaLabel: string
  /** 当前值，单位「分」—— 与后端字段同名同单位 */
  cents: number | string | null | undefined
  /** 回传的仍是「分」的字符串形式，空串表示清空 */
  onChange: (cents: string) => void
  disabled?: boolean
  placeholder?: string
}

/**
 * 价格输入框 —— 显示与输入用「元」，读写 draft 用「分」。
 *
 * 换算只在输入框边界发生一次，取值四舍五入到分（0.1 元 = 10 分，不产生尾数）。
 *
 * 两位小数在**失焦时**对齐，而不是每次按键：draft 里存的是分，若每次按键都把
 * 分值格式化回输入框，用户打到 "12." 就会被改写成 "12.00"，小数点和光标一起丢。
 * 所以输入过程中保留原始文本，离开输入框时再统一成两位小数。
 */
export function YuanPriceInput({
  id,
  ariaLabel,
  cents,
  onChange,
  disabled = false,
  placeholder = "0.00",
}: YuanPriceInputProps) {
  const [text, setText] = useState(() => yuanOf(cents))

  useEffect(() => {
    // 比较的是「分」而非文本：文本相同与否无法判断 "12.3" 和 "12.30" 是不是一回事
    if (centsOf(text) !== normalize(cents)) setText(yuanOf(cents))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents])

  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => {
        const next = e.target.value
        setText(next)
        const c = centsOf(next)
        onChange(c === null ? "" : String(c))
      }}
      onBlur={() => setText(yuanOf(centsOf(text)))}
      disabled={disabled}
      placeholder={placeholder}
      className={INPUT}
    />
  )
}
