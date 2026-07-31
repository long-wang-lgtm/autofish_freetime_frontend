"use client"

import { useRef, useState } from "react"
import { Modal } from "@/components/ui/overlay/Modal"
import type { ShipByVoucher, VoucherKind } from "@/lib/api/items"
import { fmtPrice } from "@/lib/utils/format"
import { STAGE_LABELS, PLACEHOLDERS } from "../config"
import type { SkuSummary } from "../config"

interface ShipConfigModalProps {
  open: boolean
  onClose: () => void
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  gid: number
  title: string
  skuInfo?: { skuid: number; values: string }
  currentConfig: ShipByVoucher | null
  byEntirety: boolean
  /** 是否有 SKU 规格 — 控制"按SKU设置"按钮和 SKU 明细表是否可见 */
  hasSkus?: boolean
  /** SKU 列表（多规格时传入，按SKU模式下展示明细表） */
  skus?: SkuSummary[]
  voucherKinds: VoucherKind[]
  onBackToSku?: () => void
  /** 切换配置范围（按商品整体 ↔ 按SKU设置） */
  onToggleByEntirety?: () => void
  /** SKU 明细表中点击某行，切换到该 SKU 的配置 */
  onSelectSku?: (skuid: number) => void
  onSave: (data: ShipByVoucher) => Promise<void>
}

export function ShipConfigModal({
  open,
  onClose,
  stage,
  gid,
  title,
  skuInfo,
  currentConfig,
  byEntirety,
  hasSkus = false,
  skus,
  voucherKinds,
  onBackToSku,
  onToggleByEntirety,
  onSelectSku,
  onSave,
}: ShipConfigModalProps) {
  const [kind, setKind] = useState<'DIRECT' | 'VOUCHER'>(
    currentConfig?.kind ?? 'DIRECT'
  )
  const [voucherkindid, setVoucherkindid] = useState<number | null>(
    currentConfig?.voucherkindid ?? null
  )
  const [useinstructions, setUseinstructions] = useState(
    currentConfig?.useinstructions ?? ''
  )
  const [saving, setSaving] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const stageLabel = STAGE_LABELS[stage]

  /** 在 textarea 光标处插入占位符，无光标则追加到末尾 */
  const insertPlaceholder = (value: string) => {
    const ta = textareaRef.current
    if (!ta) return

    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = useinstructions

    const next = text.slice(0, start) + value + text.slice(end)

    setUseinstructions(next)

    requestAnimationFrame(() => {
      const pos = start + value.length
      ta.setSelectionRange(pos, pos)
      ta.focus()
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        kind,
        skuid: skuInfo?.skuid ?? null,
        voucherkindid: kind === 'VOUCHER' ? voucherkindid : null,
        useinstructions: useinstructions || null,
      })
    } finally {
      setSaving(false)
    }
  }

  // ──────────────────────────────────────────────
  // 复用按钮样式
  // ──────────────────────────────────────────────
  const toggleBtn = (active: boolean, enabled = true) =>
    `inline-flex px-4 h-9 text-sm rounded-lg border transition-colors font-medium items-center ${
      active
        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200'
        : enabled
          ? 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
          : 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200'
    }`

  const footer = (
    <div className="flex justify-end gap-2.5">
      <button
        onClick={onClose}
        disabled={saving}
        className="inline-flex px-5 h-9 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 items-center"
      >
        取消
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex px-6 h-9 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm items-center"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title={stageLabel} size="xl" footer={footer}>
      <div className="min-h-[410px]">

        {/* ── 返回SKU列表 ── */}
        {onBackToSku && (
          <button
            onClick={onBackToSku}
            className="text-xs text-blue-600 hover:underline mb-2 inline-block"
          >
            ← 返回SKU列表
          </button>
        )}

        {/* ── 商品上下文（脱离配置表单，作为标题延伸） ── */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900 leading-snug">ID: {gid}</p>
          <p className="text-sm font-semibold text-gray-900 leading-snug">商品：{title}</p>
        </div>

        {/* ── 配置区（三区 flex 布局，label 左对齐） ── */}
        <div className="flex flex-col gap-5">

          {/* 销售规格 */}
          <div className="flex gap-4">
            <label className="w-16 flex-shrink-0 text-sm font-semibold text-gray-800 pt-1.5">销售规格</label>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { if (!byEntirety && onToggleByEntirety) onToggleByEntirety() }}
                  className={toggleBtn(byEntirety, hasSkus)}
                >
                  按商品整体
                </button>
                {hasSkus && (
                  <button
                    type="button"
                    onClick={() => { if (byEntirety && onToggleByEntirety) onToggleByEntirety() }}
                    className={toggleBtn(!byEntirety)}
                  >
                    按SKU设置
                  </button>
                )}
              </div>
              {!byEntirety && skuInfo && (
                <p className="mt-1.5 text-xs text-gray-500">
                  当前: <span className="text-gray-700 font-medium">{skuInfo.values}</span>
                </p>
              )}
            </div>
          </div>

          {/* SKU 明细表（仅多规格 + 按SKU模式） */}
          {hasSkus && !byEntirety && skus && skus.length > 0 && (
            <div className="flex gap-4">
              <div className="w-16 flex-shrink-0" />
              <div className="flex-1 min-w-0 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="text-left py-1.5 px-3 font-medium">规格</th>
                      <th className="text-right py-1.5 px-3 font-medium w-20">价格</th>
                      <th className="text-center py-1.5 px-3 font-medium w-16">配置</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {skus.map((sku) => {
                      const isActive = sku.skuid === skuInfo?.skuid
                      return (
                        <tr
                          key={sku.skuid}
                          onClick={() => {
                            if (!isActive && onSelectSku) onSelectSku(sku.skuid)
                          }}
                          className={`cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <td className="py-1.5 px-3 font-medium">{sku.values}</td>
                          <td className="py-1.5 px-3 text-right tabular-nums">
                            {sku.price != null ? fmtPrice(sku.price) : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            {sku.hasConfig ? (
                              <span className="text-green-600">已配置</span>
                            ) : (
                              <span className="text-gray-400">未配置</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 发货方式 */}
          <div className="flex gap-4">
            <label className="w-16 flex-shrink-0 text-sm font-semibold text-gray-800 pt-1.5">发货方式</label>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setKind('DIRECT')}
                  className={toggleBtn(kind === 'DIRECT')}
                >
                  无卡发货
                </button>
                <button
                  type="button"
                  onClick={() => setKind('VOUCHER')}
                  className={toggleBtn(kind === 'VOUCHER')}
                >
                  卡密发货
                </button>
              </div>
              {/* 卡种 — 仅卡密模式显示 */}
              {kind === 'VOUCHER' && (
                <div className="mt-2">
                  <select
                    value={voucherkindid ?? ''}
                    onChange={(e) => setVoucherkindid(e.target.value ? Number(e.target.value) : null)}
                    className="w-full max-w-[260px] h-9 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">选择卡种</option>
                    {voucherKinds.map((vk) => (
                      <option key={vk.id} value={vk.id}>
                        {vk.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 使用说明 */}
          <div className="flex gap-4">
            <label className="w-16 flex-shrink-0 text-sm font-semibold text-gray-800 pt-1">使用说明</label>
            <div className="flex-1 min-w-0 flex flex-col">
              {/* 占位符工具栏 */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs text-gray-400 flex-shrink-0">插入:</span>
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => insertPlaceholder(p.value)}
                    className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md whitespace-nowrap active:scale-95 transition-all select-none"
                    title={`插入 ${p.value}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                value={useinstructions}
                onChange={(e) => setUseinstructions(e.target.value)}
                rows={kind === 'VOUCHER' ? 4 : 5}
                className="w-full px-3.5 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical placeholder:text-gray-400"
                placeholder="输入发货内容，点击上方按钮插入占位符…"
              />

              <span className="text-xs text-gray-400 mt-1 self-end">{useinstructions.length} 字</span>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  )
}
