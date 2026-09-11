"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { FansPriceUpdate, ShopItem } from "@/lib/api/items"
import { FANS_GROUPS, fansPrices, itemPrice } from "../config"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

/**
 * 粉丝价提交载荷 —— 三档都可选，留空的档不会出现在 Body 里。
 * 形状与 lib/api/items.ts 的 FansPriceUpdate 一致（类型定义就近放在 API 模块）。
 */
export type FansPriceSubmit = FansPriceUpdate

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
 * 粉丝价弹窗 —— 全部粉丝价 / 老粉价 / 已购粉价。
 *
 * 三档都是可选的：留空 = 不改这一档，提交时整个省略该键（后端只把带了的档下发到闲鱼）。
 * 填了的档校验两条：格式，以及「不得高于商品现价」——粉丝价是折让，高于现价没有意义。
 * 现价取不到时（多规格且 reservePrice 解析不出、SKU 也没价）跳过这条，不阻塞提交。
 *
 * 用列表带回的 fans 预填，未设置过的档位留空。
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

  // 逐档校验：留空 = 不改这一档，不报错；填了才查格式与现价上限
  const fields: FieldState[] = drafts.map((draft) => {
    if (draft.trim() === '') return { value: null }
    const value = parsePrice(draft)
    if (value === null) return { value: null, error: '价格格式有误，最多两位小数' }
    if (listedPrice !== null && value > listedPrice) {
      return { value, error: `不能高于商品现价 ${listedPrice} 元` }
    }
    return { value }
  })

  // 顺序约束只在「已填的档」之间比较 —— 留空的档不参与，这正是后端本次改动的语义。
  // 把「低于下一档」的错误挂在档位更高（位置更靠前）的那一格上
  const filled = fields.map((f, i) => (f.value !== null ? i : -1)).filter((i) => i >= 0)
  for (let k = 1; k < filled.length; k++) {
    const prev = fields[filled[k - 1]]
    const curr = fields[filled[k]]
    if (!prev.error && !curr.error && prev.value! < curr.value!) {
      prev.error = `不能低于${FANS_GROUPS[filled[k]].title}`
    }
  }

  // 下限：后端 route 里是 `fans.max_price() < float(item.reservePrice) * 0.1` 报 400。
  // 镜像它的 max 语义而不是逐档比较 —— 逐档更严，会把后端本来接受的组合（如 all=50 old=1）
  // 挡在前端，前端比后端严等于凭空砍掉一个可用操作
  if (listedPrice !== null && filled.length > 0) {
    const floor = Math.round(listedPrice * 0.1 * 100) / 100
    const maxFilled = Math.max(...filled.map((i) => fields[i].value!))
    const anchor = fields[filled[0]]
    if (maxFilled < floor && !anchor.error) {
      anchor.error = `不能低于商品现价的 10%（${floor} 元）`
    }
  }

  // 至少填一档才有提交的意义：三档全空等于什么都没改，后端还会下发一个空的 fansPriceList
  const canSubmit = filled.length > 0 && fields.every((f) => !f.error) && !saving

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    // 只带填了的档。留空的一律省略键而不是传 null —— 后端校验器 values.get('all', 0)
    // 在「键存在但值为 null」时拿到 None，随后 None < old 会抛 TypeError
    const payload: FansPriceSubmit = {}
    FANS_GROUPS.forEach(({ key }, i) => {
      const value = fields[i].value
      if (value !== null) payload[key] = value
    })
    try {
      await onConfirm(item, payload)
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
                  placeholder="留空则不修改"
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
            留空的档位不会被修改。已填档位须满足 全部粉丝价 ≥ 老粉价 ≥ 已购粉价
            {listedPrice !== null && `，且介于商品现价的 10%（${Math.round(listedPrice * 0.1 * 100) / 100} 元）与现价 ${listedPrice} 元之间`}
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
