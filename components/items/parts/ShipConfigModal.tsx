"use client"

import { useRef, useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { Modal } from "@/components/ui/overlay/Modal"
import { BottomSheet } from "@/components/ui/overlay/Sheet"
import { ConfirmDialog } from "@/components/ui/overlay/ConfirmDialog"
import type { ItemSKU, ShipConfig, ShipByVoucher, VoucherKind } from "@/lib/api/items"
import { fmtPrice } from "@/lib/utils/format"
import { STAGE_LABELS, PLACEHOLDERS, isShipByVoucherValid, type SkuSummary } from "../config"

interface ShipConfigModalProps {
  open: boolean
  onClose: () => void
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  gid: number
  title: string
  isMobile: boolean
  /** 商品 SKU 列表（null=单规格或无SKU，不显示SKU选区） */
  skus: ItemSKU[] | null
  /** 当前 stage 的完整配置（null=从未配置过） */
  config: ShipConfig | null
  voucherKinds: VoucherKind[]
  /** 保存回调：voucher 数据 + 当前编辑范围 */
  onSave: (data: ShipByVoucher, byEntirety: boolean) => Promise<void>
}

type ConfirmAction =
  | { type: 'switch'; byEntirety: boolean; sku: ItemSKU | null }
  | { type: 'close' }

export function ShipConfigModal({
  open,
  onClose,
  stage,
  gid,
  title,
  isMobile,
  skus,
  config,
  voucherKinds,
  onSave,
}: ShipConfigModalProps) {
  // ── 规格判断 ──
  const hasMultiSku = skus != null && skus.length > 1

  // ── 编辑范围（内部状态） ──
  const initialByEntirety = config?.byEntirety ?? (hasMultiSku ? false : true)
  const initialSku = hasMultiSku && skus ? skus[0] : null
  const [byEntirety, setByEntirety] = useState(initialByEntirety)
  const [selectedSku, setSelectedSku] = useState<ItemSKU | null>(initialSku)

  // ── 辅助：获取指定范围的已保存配置 ──
  const resolveConfig = (
    isEntirety: boolean,
    sku: ItemSKU | null,
  ): ShipByVoucher | null => {
    if (!config) return null
    if (isEntirety) return config.entirety ?? null
    if (sku) return config.skus[sku.skuid] ?? null
    return null
  }
  const currentCfg = resolveConfig(byEntirety, selectedSku)

  // ── 表单状态（从 currentCfg 初始化） ──
  const [kind, setKind] = useState<'DIRECT' | 'VOUCHER'>(
    currentCfg?.kind ?? 'DIRECT'
  )
  const [voucherkindid, setVoucherkindid] = useState<number | null>(
    currentCfg?.voucherkindid ?? null
  )
  const [useinstructions, setUseinstructions] = useState(
    currentCfg?.useinstructions ?? ''
  )
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── 应用切换（重置表单到目标配置） ──
  const applySwitch = (newByEntirety: boolean, newSku: ItemSKU | null) => {
    setByEntirety(newByEntirety)
    setSelectedSku(newSku)
    const cfg = resolveConfig(newByEntirety, newSku)
    setKind(cfg?.kind ?? 'DIRECT')
    setVoucherkindid(cfg?.voucherkindid ?? null)
    setUseinstructions(cfg?.useinstructions ?? '')
    setIsDirty(false)
  }

  // ── 切换编辑目标（带脏确认） ──
  const switchEditTarget = (newByEntirety: boolean, newSku: ItemSKU | null) => {
    if (isDirty) {
      setConfirmAction({ type: 'switch', byEntirety: newByEntirety, sku: newSku })
      return
    }
    applySwitch(newByEntirety, newSku)
  }

  // ── SKU 摘要列表（PC 左栏 / 移动端 Chip 行共用） ──
  const skuSummaries = useMemo<SkuSummary[]>(() => {
    if (!skus) return []
    return skus.map((sku) => ({
      skuid: sku.skuid,
      values: sku.values.map((v) => v.value).join(' / '),
      price: sku.price,
      hasConfig: isShipByVoucherValid(config?.skus[sku.skuid]),
    }))
  }, [skus, config])

  // ── 占位符插入 ──
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
    if (!isDirty) setIsDirty(true)
  }

  // ── 保存 ──
  const handleSave = async () => {
    setSaving(true)
    try {
      const skuId = byEntirety ? null : (selectedSku?.skuid ?? null)
      await onSave({
        kind,
        skuid: skuId,
        voucherkindid: kind === 'VOUCHER' ? voucherkindid : null,
        useinstructions: useinstructions || null,
      }, byEntirety)
      setIsDirty(false)
    } finally {
      setSaving(false)
    }
  }

  // ── 关闭 ──
  const handleClose = () => {
    if (isDirty) {
      setConfirmAction({ type: 'close' })
    } else {
      onClose()
    }
  }

  // ── 确认丢弃 ──
  const handleConfirmDiscard = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'close') {
      onClose()
    } else {
      applySwitch(confirmAction.byEntirety, confirmAction.sku)
    }
    setConfirmAction(null)
  }

  // ── 选中 SKU 值标签 ──
  const selectedSkuLabel = selectedSku
    ? selectedSku.values.map((v) => v.value).join(' / ')
    : ''

  // ═══════════════════════════════════════════════════════════════
  // 公共：按钮样式
  // ═══════════════════════════════════════════════════════════════
  const toggleBtnClass = (active: boolean) =>
    `inline-flex whitespace-nowrap ${isMobile ? 'flex-1 justify-center' : ''} px-4 h-9 text-sm rounded-lg border transition-colors font-medium items-center ${
      active
        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
    }`

  // ═══════════════════════════════════════════════════════════════
  // 公共：配置表单
  // ═══════════════════════════════════════════════════════════════
  const renderConfigForm = () => (
    <>
      {/* 发货方式 */}
      <div className="flex items-center gap-4">
        <label className="w-16 flex-shrink-0 text-sm font-semibold text-gray-800">发货方式</label>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setKind('DIRECT'); if (kind !== 'DIRECT') setIsDirty(true) }}
              className={toggleBtnClass(kind === 'DIRECT')}
            >
              无卡发货
            </button>
            <button
              type="button"
              onClick={() => { setKind('VOUCHER'); if (kind !== 'VOUCHER') setIsDirty(true) }}
              className={toggleBtnClass(kind === 'VOUCHER')}
            >
              卡密发货
            </button>
          </div>
          {kind === 'VOUCHER' && (
            <div className="mt-2">
              <select
                value={voucherkindid ?? ''}
                onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setVoucherkindid(v); if (voucherkindid !== v) setIsDirty(true) }}
                className={`${isMobile ? 'w-full' : 'w-full max-w-[260px]'} h-9 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white`}
              >
                <option value="">选择卡种</option>
                {voucherKinds.map((vk) => (
                  <option key={vk.id} value={vk.id}>{vk.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="flex gap-4">
        <label className="w-16 flex-shrink-0 text-sm font-semibold text-gray-800 pt-0.5">使用说明</label>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5 mb-3">
            {/* <span className="text-xs text-gray-400 flex-shrink-0">插入:</span> */}
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
            onChange={(e) => { setUseinstructions(e.target.value); if (!isDirty) setIsDirty(true) }}
            rows={kind === 'VOUCHER' ? 4 : 5}
            className={`w-full px-3.5 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical placeholder:text-gray-400 ${
              isMobile ? 'text-base' : 'text-sm'
            }`}
            placeholder="输入发货内容，点击上方按钮插入占位符…"
          />
          <span className="text-xs text-gray-400 mt-1.5 self-end">{useinstructions.length} 字</span>
        </div>
      </div>
    </>
  )

  // ═══════════════════════════════════════════════════════════════
  // 公共：Footer
  // ═══════════════════════════════════════════════════════════════
  const footer = isMobile ? (
    <div className="flex gap-3">
      <button
        onClick={handleClose}
        disabled={saving}
        className="flex-1 h-11 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center"
      >
        取消
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex-1 h-11 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  ) : (
    <div className="flex justify-end gap-2.5">
      <button
        onClick={handleClose}
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

  // ═══════════════════════════════════════════════════════════════
  // 确认对话框
  // ═══════════════════════════════════════════════════════════════
  const confirmDialog = confirmAction && createPortal(
    <ConfirmDialog
      open
      onOpenChange={() => setConfirmAction(null)}
      title="放弃未保存的修改？"
      description="当前编辑的内容尚未保存，切换将丢失这些修改。"
      confirmLabel="放弃"
      cancelLabel="继续编辑"
      variant="danger"
      onConfirm={handleConfirmDiscard}
    />,
    document.body
  )

  // ═══════════════════════════════════════════════════════════════
  // PC：SKU 列表面板（左栏 240px）
  // ═══════════════════════════════════════════════════════════════
  const renderSkuListPanel = () => (
    <div className="w-[240px] flex-shrink-0 border-r border-gray-100 bg-gray-50/50 overflow-y-auto max-h-[420px]">
      <div className="p-2">
        {skuSummaries.map((sku) => {
          const isActive = sku.skuid === selectedSku?.skuid
          return (
            <button
              key={sku.skuid}
              onClick={() => {
                const target = skus?.find((s) => s.skuid === sku.skuid)
                if (target && !isActive) switchEditTarget(false, target)
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
                isActive
                  ? 'bg-blue-50 border-l-[3px] border-l-blue-500 text-blue-700'
                  : 'border-l-[3px] border-l-transparent hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium truncate ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                  {sku.values}
                </span>
                <span className="text-xs text-orange-600 font-semibold flex-shrink-0 ml-2">
                  {sku.price != null ? fmtPrice(sku.price / 100) : '-'}
                </span>
              </div>
              <div className={`text-[10px] mt-0.5 ${sku.hasConfig ? 'text-green-600' : 'text-gray-400'}`}>
                {sku.hasConfig ? '已配置' : '未配置'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════
  // PC：SKU 列表面板（左栏 240px）
  // ═══════════════════════════════════════════════════════════════
  const renderSkuChipRow = () => (
    <div className="pb-3 border-b border-gray-100">
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {skuSummaries.map((sku) => {
          const isActive = sku.skuid === selectedSku?.skuid
          return (
            <button
              key={sku.skuid}
              onClick={() => {
                const target = skus?.find((s) => s.skuid === sku.skuid)
                if (target && !isActive) switchEditTarget(false, target)
              }}
              ref={(el) => {
                if (el && isActive) {
                  el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
                }
              }}
              className={`flex-shrink-0 min-w-[90px] px-3 py-2 rounded-lg border-2 transition-colors text-left ${
                isActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-[11px] font-medium text-gray-800 truncate max-w-[80px]">
                {sku.values}
              </div>
              <div className="text-[10px] text-orange-600 font-semibold">
                {sku.price != null ? fmtPrice(sku.price / 100) : '-'}
              </div>
              <div
                className={`w-[6px] h-[6px] rounded-full mt-1 ${
                  sku.hasConfig ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1.5">← 滑动查看更多 SKU →</p>
    </div>
  )


  // ═══════════════════════════════════════════════════════════════
  // 移动端布局
  // ═══════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <>
        <BottomSheet open={open} onClose={handleClose} title={STAGE_LABELS[stage]} footer={footer}>
          <div className="min-h-[360px] px-4 pt-1 pb-4">
            {/* 商品信息 — 紧凑 */}
            <div className="text-sm text-gray-500 mb-6 truncate">
              商品：<span className="font-medium text-gray-900">{title}</span>
            </div>

            {/* 销售规格 — 仅多规格显示 */}
            {hasMultiSku && (
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-800 flex-shrink-0">销售规格</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { if (!byEntirety) switchEditTarget(true, null) }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      byEntirety
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    按商品
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (byEntirety) switchEditTarget(false, skus![0]) }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      !byEntirety
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    按SKU
                  </button>
                </div>
              </div>
            )}

            {/* SKU Chip 行 — 仅多规格 + 按SKU模式 */}
            {hasMultiSku && !byEntirety && renderSkuChipRow()}

            {/* 当前编辑提示 */}
            {/* {hasMultiSku && !byEntirety && selectedSku && (
              <p className="text-[11px] text-gray-500 mt-3 mb-1">
                当前编辑: <span className="font-medium text-gray-800">{selectedSkuLabel}</span>
              </p>
            )} */}

            {/* 配置表单 */}
            <div className={`flex flex-col gap-6 ${hasMultiSku ? 'mt-3' : 'mt-0'}`}>
              {renderConfigForm()}
            </div>
          </div>
        </BottomSheet>
        {confirmDialog}
      </>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // PC 布局
  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <Modal open={open} onClose={handleClose} title={STAGE_LABELS[stage]} size="xl" className="max-w-[60%]" footer={footer}>
        <div className="min-h-[410px]">
          {/* 商品信息条 */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 leading-snug">ID: {gid}</p>
            <p className="text-sm font-semibold text-gray-900 leading-snug">商品：{title}</p>
          </div>

          {/* 销售规格 — 仅多规格显示 */}
          {hasMultiSku && (
            <div className="flex gap-4 mb-4 pb-4 border-b border-gray-100">
              <label className="w-16 flex-shrink-0 text-sm font-semibold text-gray-800 pt-1.5">销售规格</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { if (!byEntirety) switchEditTarget(true, null) }}
                  className={toggleBtnClass(byEntirety)}
                >
                  按商品整体设置
                </button>
                <button
                  type="button"
                  onClick={() => { if (byEntirety) switchEditTarget(false, skus![0]) }}
                  className={toggleBtnClass(!byEntirety)}
                >
                  按SKU设置
                </button>
              </div>
            </div>
          )}

          {/* 主区域 */}
          {hasMultiSku && !byEntirety ? (
            // 按SKU：左右分栏
            <div className="flex -mx-4">
              {renderSkuListPanel()}
              <div className="flex-1 min-w-0 px-4 flex flex-col gap-5">
                {/* {selectedSku && (
                  <p className="text-xs text-gray-500">
                    当前编辑: <span className="text-gray-700 font-medium">{selectedSkuLabel}</span>
                  </p>
                )} */}
                {renderConfigForm()}
              </div>
            </div>
          ) : (
            // 按商品 / 单规格：单栏
            <div className="flex flex-col gap-5">
              {renderConfigForm()}
            </div>
          )}
        </div>
      </Modal>
      {confirmDialog}
    </>
  )
}
