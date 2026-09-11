"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { ShopItem } from "@/lib/api/items"
import { FANS_GROUPS, fansPrices, itemPrice } from "../config"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

/** 粉丝价提交载荷 —— 三档一次提交，key 与后端 Body 参数一致 */
export interface FansPriceSubmit {
  all: number
  old: number
  buy: number
}

/** 单档价格格式校验（同改价：后端按分存储，超过两位小数会被截断） */
function parsePrice(draft: string): number | null {
  const trimmed = draft.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const price = Number(trimmed)
  return price > 0 ? price : null
}

/** 一格输入框的校验结果 */
interface FieldState {
  value: number | null
  error?: string
}

interface FansPriceDialogProps {
  open: boolean
  item: ShopItem | null
  onOpenChange: (open: boolean) => void
  onConfirm: (item: ShopItem, submit: FansPriceSubmit) => Promise<void>
}

/**
 * 粉丝价弹窗 —— 三档一次提交（全部粉丝价 / 老粉价 / 已购粉价）。
 *
 * 校验对齐后端（都 > 0 且 all >= old >= buy），另加一条后端没有的：
 * 三档都不得高于商品现价 —— 粉丝价是折让，高于现价没有意义。
 * 现价取不到时（多规格且 reservePrice 解析不出、SKU 也没价）跳过这条，不阻塞提交。
 *
 * 用列表带回的 fans 预填；未设置过的档位留空，用户需要自己填齐三档。
 */
export function FansPriceDialog({ open, item, onOpenChange, onConfirm }: FansPriceDialogProps) {
  const baseId = useId()
  const firstRef = useRef<HTMLInputElement>(null)
  const [drafts, setDrafts] = useState<string[]>(['', '', ''])
  const [saving, setSaving] = useState(false)

  const listedPrice = item ? itemPrice(item) : null

  // 每次打开用当前粉丝价重新预填，不复用上一次残留的草稿
  useEffect(() => {
    if (open && item) {
      setDrafts(fansPrices(item).map((p) => (p === null ? '' : String(p))))
      setSaving(false)
    }
  }, [open, item])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      firstRef.current?.focus()
      firstRef.current?.select()
    }, 0)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onOpenChange(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, saving, onOpenChange])

  if (!open || !item) return null

  // 逐档校验：格式 → 现价上限。档位之间的顺序关系算完再补，因为要拿到三档的值
  const fields: FieldState[] = drafts.map((draft) => {
    if (draft.trim() === '') return { value: null, error: '请输入价格' }
    const value = parsePrice(draft)
    if (value === null) return { value: null, error: '价格格式有误，最多两位小数' }
    if (listedPrice !== null && value > listedPrice) {
      return { value, error: `不能高于商品现价 ${listedPrice} 元` }
    }
    return { value }
  })

  const [allState, oldState, buyState] = fields
  // all >= old >= buy：把「低于下一档」的错误挂在下调的那一档上
  if (!allState.error && !oldState.error && allState.value! < oldState.value!) {
    allState.error = '不能低于老粉价'
  }
  if (!oldState.error && !buyState.error && oldState.value! < buyState.value!) {
    oldState.error = '不能低于已购粉价'
  }

  const canSubmit = fields.every((f) => !f.error) && !saving

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      await onConfirm(item, {
        all: allState.value!,
        old: oldState.value!,
        buy: buyState.value!,
      })
      onOpenChange(false)
    } catch {
      // 错误提示由 mutation 的 onError toast 负责，这里保持弹窗打开让用户重试
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !saving && onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 max-w-sm w-full mx-4"
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">设置粉丝价</h2>
        <p
          className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate"
          title={item.title || '无标题'}
        >
          {item.title || '无标题'}
        </p>

        <div className="mt-4 space-y-3">
          {FANS_GROUPS.map(({ key, title }, i) => (
            <div key={key} className="space-y-1">
              <label
                htmlFor={`${baseId}-${key}`}
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {title}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                  ¥
                </span>
                <input
                  id={`${baseId}-${key}`}
                  ref={i === 0 ? firstRef : undefined}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={drafts[i]}
                  onChange={(e) =>
                    setDrafts((prev) => prev.map((d, j) => (j === i ? e.target.value : d)))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  disabled={saving}
                  className="w-full h-10 pl-7 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 dark:disabled:bg-gray-800"
                />
              </div>
              {fields[i].error && (
                <p className="text-sm text-red-600 dark:text-red-400">{fields[i].error}</p>
              )}
            </div>
          ))}

          <p className="text-xs text-gray-400 dark:text-gray-500">
            三档须满足 全部粉丝价 ≥ 老粉价 ≥ 已购粉价
            {listedPrice !== null && `，且不高于商品现价 ${listedPrice} 元`}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-10 py-2 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-10 py-2 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <LoadingSpinner size="sm" />}
            确认设置
          </button>
        </div>
      </div>
    </div>
  )
}
