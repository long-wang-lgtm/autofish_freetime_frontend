'use client'

import { useMemo, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Sheet, BottomSheet } from '@/components/ui/Sheet'
import {
  type ProductItem,
  storedMonitorItem,
  updateMonitorItemPriority,
  activateMonitorItem,
  cancelMonitorItem,
} from '@/lib/api/selection'
import { detectAnomalies } from '@/components/selection/product/hourlyTrendUtils'
import { AnomalyBanner } from '@/components/selection/product/AnomalyBanner'
import { WindowCompareCards } from '@/components/selection/product/WindowCompareCards'
import { CumulativeGrowthChart } from '@/components/selection/product/CumulativeGrowthChart'
import { IntentConversionChart } from '@/components/selection/product/IntentConversionChart'
import { TrafficActionChart } from '@/components/selection/product/TrafficActionChart'
import { StabilityPanel } from '@/components/selection/product/StabilityPanel'
import { GrowthPricePanel } from '@/components/selection/product/GrowthPricePanel'

interface ProductDiagnosticDrawerProps {
  product: ProductItem | null
  onClose: () => void
}

function fmtPrice(v: number): string {
  return `¥${v.toLocaleString('zh-CN')}`
}

export function ProductDiagnosticDrawer({ product, onClose }: ProductDiagnosticDrawerProps) {
  const open = !!product
  const isMobile = useIsMobile()
  const [editingPriority, setEditingPriority] = useState(false)
  const queryClient = useQueryClient()

  const alerts = useMemo(() => {
    if (!product) return []
    return detectAnomalies(product.windowsMetrics, product.hourlyTrend)
  }, [product])

  const wm = product?.windowsMetrics
  const ht = product?.hourlyTrend
  const hasData = wm != null
  const hasEnoughTrendPoints = ht && ht.ts && ht.ts.length >= 3

  // 窗口占比：d1_total_dwant / d7_total_dwant
  const windowShare = wm && wm.d7.total_dwant > 0
    ? wm.d1.total_dwant / wm.d7.total_dwant
    : null

  // 升温信号
  let acceleration: number | null = null
  if (wm?.d1?.inquiry_rate != null && wm?.d7?.inquiry_rate != null && wm.d7.inquiry_rate > 0) {
    acceleration = wm.d1.inquiry_rate / wm.d7.inquiry_rate - 1
  }

  const handleStored = useCallback(async (gid: string) => {
    await storedMonitorItem(gid)
    queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
  }, [queryClient])

  const handlePriorityChange = useCallback(async (gid: string, priority: number) => {
    await updateMonitorItemPriority(gid, priority)
    setEditingPriority(false)
    queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
  }, [queryClient])

  const title = product ? `${product.description || product.title || '商品'} / ${product.id}` : ''

  const content = (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Header 元数据 */}
      {product && (
        <div className="space-y-2">
          {/* 第1行：标题 + 价格 */}
          <div className="flex justify-between items-start">
            <div className="text-sm font-semibold text-gray-900 leading-snug flex-1 min-w-0">
              {product.description || product.title || '商品'}
            </div>
            <div className="text-right ml-3 shrink-0">
              <div className="text-[15px] font-bold text-gray-900 tabular-nums">{fmtPrice(product.price)}</div>
              <div className="text-[10px]">
                {product.priceTrend === 'up' && <span className="text-green-600 font-semibold">↑提价</span>}
                {product.priceTrend === 'down' && <span className="text-red-600 font-semibold">↓降价</span>}
                {product.priceTrend === 'flat' && <span className="text-gray-400">→平稳</span>}
                {(product.priceTrend == null) && <span className="text-gray-400">价格未知</span>}
              </div>
            </div>
          </div>

          {/* 第2行：GID链接 + 状态 + 优先级 + 入库 */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://www.goofish.com/item?id=${product.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] text-gray-500 font-mono border-b border-dotted border-gray-300 hover:text-gray-700 transition-colors"
            >
              {product.id} ↗
            </a>

            {/* 状态 badge */}
            {(() => {
              const STATUS_MAP: Record<number, { label: string; dot: string; bg: string; text: string }> = {
                0: { label: '已暂停', dot: 'bg-gray-400',   bg: 'bg-gray-100',   text: 'text-gray-500' },
                1: { label: '监控中', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                2: { label: '已分析', dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700' },
                4: { label: '已入库', dot: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700' },
              }
              const s = STATUS_MAP[product.monitorStatus ?? -1]
              const isInteractive = product.monitorStatus === 0 || product.monitorStatus === 1
              if (!s) return <span className="text-xs text-gray-400">-</span>
              if (!isInteractive) {
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                )
              }
              return (
                <button
                  onClick={() => {
                    const fn = product.monitorStatus === 1 ? cancelMonitorItem : activateMonitorItem
                    fn(product.id).then(() => queryClient.invalidateQueries({ queryKey: ['monitor-items'] }))
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text} hover:opacity-80 transition-opacity cursor-pointer`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </button>
              )
            })()}

            {/* 优先级 */}
            {product.priority !== null && (
              editingPriority ? (
                <select
                  value={product.priority}
                  onChange={(e) => handlePriorityChange(product.id, Number(e.target.value))}
                  onBlur={() => setEditingPriority(false)}
                  className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer"
                  autoFocus
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setEditingPriority(true)}
                  className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 cursor-text hover:bg-amber-100 transition-colors"
                >
                  ⚡优先级 {product.priority}
                </button>
              )
            )}

            {/* 入库按钮 */}
            {product.monitorStatus !== 4 && (
              <button
                onClick={() => handleStored(product.id)}
                className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                + 入库
              </button>
            )}
          </div>

          {/* 第3行：采集 + 上架 + 商家 */}
          <div className="flex gap-3 text-[11px] text-gray-500">
            <span>
              采集:{' '}
              {wm?.d7 != null ? (
                <span className="font-medium text-gray-700">
                  {wm.d7.quality_label === 'reliable' ? '可靠' :
                   wm.d7.quality_label === 'limited' ? '有限' :
                   wm.d7.quality_label === 'insufficient' ? '不足' : '-'}
                  ({wm.d7.fetch_count ?? '-'}次)
                </span>
              ) : '-'}
            </span>
            {product.daysSincePublish != null && (
              <span>上架 {Math.round(product.daysSincePublish)} 天</span>
            )}
            <span>商家: {product.shopName || '-'}</span>
          </div>

          {/* 第4行：关键词 pills */}
          {product.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.keywords.map(kw => (
                <span key={kw} className="text-[11px] text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* 非活跃状态警告 */}
          {product.monitorStatus != null && product.monitorStatus !== 1 && (
            <span className="inline-block text-xs font-medium text-red-600 bg-red-50 rounded px-2 py-0.5">
              {product.monitorStatus === 0 ? '已暂停' : product.monitorStatus === 2 ? '已分析' : product.monitorStatus === 4 ? '已入库' : '未知'}
            </span>
          )}
        </div>
      )}

      {/* Hero Metric — 表格触发的关键信号 */}
      {product && (
        <div className="flex items-center gap-4 px-2 py-2 bg-amber-50/50 rounded-lg border border-amber-100">
          <span className="text-xs text-gray-700">触发信号</span>
          {acceleration != null && acceleration > 0.3 ? (
            <>
              <span className="text-sm font-bold text-red-500">🔥 升温 +{(acceleration * 100).toFixed(0)}%</span>
              <span className="text-xs text-gray-700">
                D1 询单率 {(wm?.d1?.inquiry_rate != null ? (wm!.d1!.inquiry_rate * 100).toFixed(1) : '-')}%
                vs D7 {(wm?.d7?.inquiry_rate != null ? (wm!.d7!.inquiry_rate * 100).toFixed(1) : '-')}%
              </span>
            </>
          ) : acceleration != null && acceleration < -0.3 ? (
            <>
              <span className="text-sm font-bold text-blue-500">❄️ 降温 {(acceleration * -100).toFixed(0)}%</span>
              <span className="text-xs text-gray-700">
                D1 询单率 {(wm?.d1?.inquiry_rate != null ? (wm!.d1!.inquiry_rate * 100).toFixed(1) : '-')}%
                vs D7 {(wm?.d7?.inquiry_rate != null ? (wm!.d7!.inquiry_rate * 100).toFixed(1) : '-')}%
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-700">无明显异常信号</span>
              <span className="text-xs text-gray-700">各指标在正常范围内</span>
            </>
          )}
        </div>
      )}

      <hr className="border-gray-100 my-3" />

      {/* Part 0: 异常预警 */}
      <AnomalyBanner alerts={alerts} />

      <hr className="border-gray-100 my-3" />

      {!hasData ? (
        /* windows_metrics 为 null：占位提示 */
        <div className="flex items-center justify-center py-16 text-sm text-gray-700 text-center">
          该商品指标尚未生成<br />请等待更多采集数据
        </div>
      ) : (
        <>
          {/* Part 1+2: 核心指标 + 趋势图 */}
          {hasEnoughTrendPoints && ht ? (
            <div className={isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
              <WindowCompareCards
                windowsMetrics={wm}
                d7BrowseGrowth={product!.d7BrowseGrowth}
                acceleration={acceleration}
                windowShare={windowShare}
                priceTrend={product!.priceTrend}
              />

              <CumulativeGrowthChart hourlyTrend={ht} />

              <IntentConversionChart hourlyTrend={ht} />

              <TrafficActionChart hourlyTrend={ht} />
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-gray-600">
              数据点不足，至少需要 3 次采集
            </div>
          )}

          <hr className="border-gray-100 my-3" />

          {/* Part 3: 稳定性诊断 */}
          <StabilityPanel hourlyTrend={ht ?? null} />

          <hr className="border-gray-100 my-3" />

          {/* Part 4: 基础数据（折叠区） */}
          <GrowthPricePanel product={product} />
        </>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={product?.description || product?.title || '商品'}
        subtitle={product ? `GID: ${product.id}` : undefined}
        heightRatio={0.92}
      >
        {content}
      </BottomSheet>
    )
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      width="80vw"
    >
      {content}
    </Sheet>
  )
}
