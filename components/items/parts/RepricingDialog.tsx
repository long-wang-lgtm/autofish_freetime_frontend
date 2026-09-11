"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { ShopItem } from "@/lib/api/items"
import { PRO_DEFAULT_QUANTITY } from "@/lib/api/items"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

/** 改价提交载荷 —— 普通账号只提交价格；鱼小铺接口一次提交「价格 + 库存」 */
export interface RepriceSubmit {
  price: number
  quantity?: number
}

/**
 * 价格校验 —— 后端按 int(price * 100) 换算成分，超过两位小数会被静默截断，
 * 所以这里直接拒掉，避免用户输入 12.345 而实际生效 12.34。
 */
function validatePrice(draft: string): { price: number; error?: string } {
  const trimmed = draft.trim()
  if (trimmed === '') return { price: NaN, error: '请输入价格' }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { price: NaN, error: '价格格式有误，最多两位小数' }
  const price = Number(trimmed)
  if (price <= 0) return { price, error: '价格必须大于 0' }
  return { price }
}

/** 库存校验 —— 后端为 int，闲鱼侧另有上限，超限由后端 403 返回原因 */
function validateQuantity(draft: string): { quantity: number; error?: string } {
  const trimmed = draft.trim()
  if (trimmed === '') return { quantity: NaN, error: '请输入库存' }
  if (!/^\d+$/.test(trimmed)) return { quantity: NaN, error: '库存必须为整数' }
  const quantity = Number(trimmed)
  if (quantity <= 0) return { quantity, error: '库存必须大于 0' }
  return { quantity }
}

interface RepricingDialogProps {
  open: boolean
  item: ShopItem | null
  onOpenChange: (open: boolean) => void
  onConfirm: (item: ShopItem, submit: RepriceSubmit) => Promise<void>
}

/**
 * 改价弹窗 —— 不复用 ConfirmDialog：后者的 description 渲染在 <p> 内，
 * 塞输入框语义不对，也无法把焦点送到输入框。外观沿用同一套（遮罩 + rounded-xl 白卡）。
 *
 * 鱼小铺账号多一栏「库存」：后端 /edit.price.by.pro 一次提交「价格 + 库存」，
 * 不传 quantity 就按后端默认值写入，等于改个价顺手把库存重置了；
 * 所以必须显示出来，并用列表接口带回的真实库存预填。普通账号接口只收价格，不渲染这一栏。
 *
 * 与 ShelfActions/DeleteItemButton「点完即关、靠 toast 反馈」不同：这里成功才关闭，
 * 失败保持打开，用户可以直接改数字重试。
 */
export function RepricingDialog({ open, item, onOpenChange, onConfirm }: RepricingDialogProps) {
  const baseId = useId()
  const priceId = `${baseId}-price`
  const quantityId = `${baseId}-quantity`
  const priceRef = useRef<HTMLInputElement>(null)
  const [priceDraft, setPriceDraft] = useState('')
  const [quantityDraft, setQuantityDraft] = useState(String(PRO_DEFAULT_QUANTITY))
  const [saving, setSaving] = useState(false)

  // 每次打开都用当前值重新预填，不复用上一次残留的草稿。
  // 库存取列表接口带回的真实值，未同步到时才退回后端默认值
  useEffect(() => {
    if (open) {
      setPriceDraft(item?.reservePrice ?? '')
      setQuantityDraft(String(item?.quantity ?? PRO_DEFAULT_QUANTITY))
      setSaving(false)
    }
  }, [open, item])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      priceRef.current?.focus()
      priceRef.current?.select()
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

  const isPro = item.account.isPro
  const priceValidation = validatePrice(priceDraft)
  const quantityValidation = isPro ? validateQuantity(quantityDraft) : null
  const canSubmit = !priceValidation.error && !quantityValidation?.error

  const handleSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      await onConfirm(item, {
        price: priceValidation.price,
        quantity: quantityValidation?.quantity,
      })
      onOpenChange(false)
    } catch {
      // 错误提示由 mutation 的 onError toast 负责，这里保持弹窗打开让用户重试
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full h-10 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 dark:disabled:bg-gray-800'

  const submitOnEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
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
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">改价</h2>
        <p
          className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate"
          title={item.title || '无标题'}
        >
          {item.title || '无标题'}
        </p>

        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <label htmlFor={priceId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
              新价格（元）
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                ¥
              </span>
              <input
                id={priceId}
                ref={priceRef}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                onKeyDown={submitOnEnter}
                disabled={saving}
                className={`${inputClass} pl-7 pr-3`}
              />
            </div>
            {priceValidation.error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{priceValidation.error}</p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                当前 {item.reservePrice || '-'} 元 · {isPro ? '鱼小铺账号' : '普通账号'}
              </p>
            )}
          </div>

          {isPro && (
            <div className="space-y-1">
              <label htmlFor={quantityId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                库存
              </label>
              <input
                id={quantityId}
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={quantityDraft}
                onChange={(e) => setQuantityDraft(e.target.value)}
                onKeyDown={submitOnEnter}
                disabled={saving}
                className={`${inputClass} px-3`}
              />
              {quantityValidation?.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{quantityValidation.error}</p>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  该接口一次提交价格和库存，改价会同时把库存写成此值
                </p>
              )}
            </div>
          )}
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
            disabled={!canSubmit || saving}
            className="h-10 py-2 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <LoadingSpinner size="sm" />}
            确认改价
          </button>
        </div>
      </div>
    </div>
  )
}
