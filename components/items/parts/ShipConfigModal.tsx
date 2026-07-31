"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/overlay/Modal"
import type { ShipByVoucher, VoucherKind } from "@/lib/api/items"
import { STAGE_LABELS, PLACEHOLDERS } from "../config"

interface ShipConfigModalProps {
  open: boolean
  onClose: () => void
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  gid: number
  title: string
  skuInfo?: { skuid: number; values: string }
  currentConfig: ShipByVoucher | null
  byEntirety: boolean
  voucherKinds: VoucherKind[]
  onBackToSku?: () => void
  onSave: (data: ShipByVoucher) => Promise<void>
}

export function ShipConfigModal({
  open,
  onClose,
  stage,
  gid: _gid,
  title,
  skuInfo,
  currentConfig,
  byEntirety,
  voucherKinds,
  onBackToSku,
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

  const stageLabel = STAGE_LABELS[stage]

  const insertPlaceholder = (value: string) => {
    setUseinstructions((prev) => prev + value)
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

  return (
    <Modal open={open} onClose={onClose} title={stageLabel} size="md">
      {/* 商品 / SKU 信息条 + 返回按钮 */}
      <div className="mb-4">
        {onBackToSku && (
          <button
            onClick={onBackToSku}
            className="text-xs text-blue-600 hover:underline mb-1 inline-block"
          >
            ← 返回SKU列表
          </button>
        )}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-500">商品:</span>
            <span className="font-medium text-gray-900 truncate">{title}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {skuInfo && <span>SKU: {skuInfo.values}</span>}
            <span>配置模式: {byEntirety ? '按商品' : '按SKU'}</span>
          </div>
        </div>
      </div>

      {/* 发货方式切换 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">发货方式</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setKind('DIRECT')}
            className={`h-10 text-sm rounded-lg border transition-colors ${
              kind === 'DIRECT'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            无卡配置
          </button>
          <button
            type="button"
            onClick={() => setKind('VOUCHER')}
            className={`h-10 text-sm rounded-lg border transition-colors ${
              kind === 'VOUCHER'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            卡密配置
          </button>
        </div>
      </div>

      {/* 卡种选择（仅 VOUCHER） */}
      {kind === 'VOUCHER' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">卡种</label>
          <select
            value={voucherkindid ?? ''}
            onChange={(e) => setVoucherkindid(e.target.value ? Number(e.target.value) : null)}
            className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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

      {/* 使用说明 / 发货内容 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          使用说明（发货内容）
        </label>
        <textarea
          value={useinstructions}
          onChange={(e) => setUseinstructions(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
          placeholder="输入发货内容..."
        />
      </div>

      {/* 占位符选择器 */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">点击插入占位符：</div>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => insertPlaceholder(p.value)}
              className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-200 whitespace-nowrap active:scale-95 transition-all"
              title={p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 h-10 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-10 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </Modal>
  )
}
