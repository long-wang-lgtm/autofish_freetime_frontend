"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/overlay/Modal"
import type { ItemSKU, ShipConfig, ShipByVoucher, VoucherKind } from "@/lib/api/items"
import { STAGE_LABELS, getSkuConfig } from "../config"
import { ShipConfigModal } from "./ShipConfigModal"

interface SkuConfigModalProps {
  open: boolean
  onClose: () => void
  gid: number
  title: string
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  skus: ItemSKU[]
  config: ShipConfig
  voucherKinds: VoucherKind[]
  onSaveSku: (data: ShipByVoucher) => Promise<void>
  onSaveEntirety: (data: ShipByVoucher) => Promise<void>
  onConfigSaved: () => void
}

/** SKU 规格值拼接，如 "红色 / XL" */
function skuValuesLabel(sku: ItemSKU): string {
  return sku.values.map((v) => v.value).join(' / ')
}

/** 格式化价格（单位分 → 元） */
function fmtSkuPrice(priceInCents: number): string {
  return `¥${(priceInCents / 100).toFixed(0)}`
}

export function SkuConfigModal({
  open,
  onClose,
  gid,
  title,
  stage,
  skus,
  config,
  voucherKinds,
  onSaveSku,
  onSaveEntirety,
  onConfigSaved,
}: SkuConfigModalProps) {
  const stageLabel = STAGE_LABELS[stage]
  const [viewMode, setViewMode] = useState<'sku' | 'entirety'>('sku')
  const [activeSku, setActiveSku] = useState<ItemSKU | null>(null)
  const [showEntiretyConfig, setShowEntiretyConfig] = useState(false)

  const handleSaveSku = async (data: ShipByVoucher): Promise<void> => {
    await onSaveSku(data)
    setActiveSku(null)
    onConfigSaved()
  }

  const handleSaveEntirety = async (data: ShipByVoucher): Promise<void> => {
    await onSaveEntirety(data)
    setShowEntiretyConfig(false)
    onConfigSaved()
  }

  return (
    <>
      <Modal open={open && !activeSku && !showEntiretyConfig} onClose={onClose} title={`${stageLabel} - SKU明细`} size="md">
        {/* 商品信息条 */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">商品:</span>
            <span className="font-medium text-gray-900 truncate">{title}</span>
          </div>
        </div>

        {/* 按商品 / 按SKU 切换 */}
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setShowEntiretyConfig(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              viewMode === 'entirety'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            按商品配置
          </button>
          <button
            type="button"
            onClick={() => setViewMode('sku')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              viewMode === 'sku'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            按SKU配置
          </button>
        </div>

        {/* SKU 列表 */}
        {viewMode === 'sku' && (
          <div className="space-y-1">
            {skus.map((sku) => {
              const skuConfig = getSkuConfig(config, sku.skuid)
              const hasConfig = skuConfig !== null
              return (
                <button
                  key={sku.skuid}
                  onClick={() => setActiveSku(sku)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm text-gray-800 truncate">
                      {skuValuesLabel(sku)}
                    </span>
                    <span className="text-sm text-orange-600 font-medium flex-shrink-0">
                      {fmtSkuPrice(sku.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs ${hasConfig ? 'text-blue-600' : 'text-gray-400'}`}>
                      {hasConfig
                        ? (skuConfig!.kind === 'VOUCHER' ? '已配置(卡密)' : '已配置(无卡)')
                        : '未配置'
                      }
                    </span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Modal>

      {/* SKU 级配置弹窗 */}
      {activeSku && (
        <ShipConfigModal
          open={!!activeSku}
          onClose={() => { setActiveSku(null); onConfigSaved() }}
          stage={stage}
          gid={gid}
          title={title}
          skuInfo={{ skuid: activeSku.skuid, values: skuValuesLabel(activeSku) }}
          currentConfig={getSkuConfig(config, activeSku.skuid)}
          byEntirety={false}
          voucherKinds={voucherKinds}
          onBackToSku={() => { setActiveSku(null); onConfigSaved() }}
          onSave={handleSaveSku}
        />
      )}

      {/* 商品级配置弹窗 */}
      {showEntiretyConfig && (
        <ShipConfigModal
          open={showEntiretyConfig}
          onClose={() => { setShowEntiretyConfig(false); onConfigSaved() }}
          stage={stage}
          gid={gid}
          title={title}
          currentConfig={config.byEntirety === true ? config.entirety : null}
          byEntirety={true}
          voucherKinds={voucherKinds}
          onBackToSku={() => { setShowEntiretyConfig(false); onConfigSaved() }}
          onSave={handleSaveEntirety}
        />
      )}
    </>
  )
}
