'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { fmtPrice } from '@/lib/utils/format'
import type { PendingOrder } from '@/lib/api/items'

interface OrderRepriceDialogProps {
  /** 待改价的订单；null = 关闭 */
  order: PendingOrder | null
  isMobile: boolean
  onClose: () => void
  /** 提交改价 —— 失败请 throw，弹窗会保持打开让用户改数字重试 */
  onConfirm: (order: PendingOrder, newPrice: number) => Promise<void>
}

/**
 * 价格校验 —— 与后端同口径：元、两位小数以内、必须大于 0。
 * 小数位直接拒掉而不是静默截断（后端 `int(price * 100)` 会截），避免用户输入 12.345 而生效 12.34。
 */
function validatePrice(draft: string): { price: number; error?: string } {
  const trimmed = draft.trim()
  if (trimmed === '') return { price: NaN, error: '请输入价格' }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { price: NaN, error: '价格格式有误，最多两位小数' }
  const price = Number(trimmed)
  if (price <= 0) return { price, error: '价格必须大于 0' }
  return { price }
}

/**
 * 订单改价弹窗 —— PC 用居中 Modal、移动端用 BottomSheet（项目统一的弹窗规范）。
 *
 * 成功才关闭、失败保持打开：用户可以直接改数字重试（错误提示由调用方 mutation 的 toast 负责）。
 */
export function OrderRepriceDialog({ order, isMobile, onClose, onConfirm }: OrderRepriceDialogProps) {
  const priceId = useId()
  const priceRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  // 每次打开都用该单当前金额重新预填，并选中待输入
  useEffect(() => {
    if (!order) return
    setDraft(String(order.totalPrice))
    setSaving(false)
    const timer = setTimeout(() => {
      priceRef.current?.focus()
      priceRef.current?.select()
    }, 0)
    return () => clearTimeout(timer)
  }, [order])

  if (!order) return null

  const { price, error } = validatePrice(draft)
  const canSubmit = !error && !saving

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      await onConfirm(order, price)
      onClose()
    } catch {
      // 保持打开，等用户重试
    } finally {
      setSaving(false)
    }
  }

  const body = (
    <div className="space-y-3">
      <div className="text-sm text-gray-500">
        <span className="text-gray-400">订单号</span>{' '}
        <span className="tabular-nums">{order.orderId}</span>
      </div>
      <div className="text-sm text-gray-500">
        <span className="text-gray-400">买家</span> {order.buyername ?? '-'}
        <span className="mx-1.5 text-gray-300">·</span>
        <span className="text-gray-400">原价</span> {fmtPrice(order.totalPrice)}
      </div>

      <div className="space-y-1">
        <label htmlFor={priceId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          新价格（元）
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">¥</span>
          <input
            id={priceId}
            ref={priceRef}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
            disabled={saving}
            className="w-full h-10 pl-7 pr-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
          />
        </div>
        {/* {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <p className="text-xs text-gray-400">改价后买家应付金额即为该值</p>
        )} */}
      </div>
    </div>
  )

  const footer = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        取消
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="h-10 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {saving && <LoadingSpinner size="sm" />}
        确认改价
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet open onClose={onClose} title="订单改价" footer={footer}>
        <div className="px-4 pb-2">{body}</div>
      </BottomSheet>
    )
  }

  return (
    <Modal open onClose={onClose} title="订单改价" size="sm" footer={footer}>
      {body}
    </Modal>
  )
}
