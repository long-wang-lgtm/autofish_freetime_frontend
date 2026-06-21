'use client'

import { useMemo } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Sheet, BottomSheet } from '@/components/ui/Sheet'
import type { ProductItem } from '@/lib/api/selection'
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

export function ProductDiagnosticDrawer({ product, onClose }: ProductDiagnosticDrawerProps) {
  const open = !!product
  const isMobile = useIsMobile()

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

  const title = product ? `${product.description || product.title || '商品'} / ${product.id}` : ''

  const content = (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Header 元数据 */}
      {product && (
        <div className="space-y-1.5">
          <div className="text-xs text-gray-600 font-mono">
            GID: {product.id}
            {' · '}
            状态: {product.monitorStatus != null
              ? { 0: '已暂停', 1: '监控中', 2: '已分析', 3: '已发布' }[product.monitorStatus] ?? '-'
              : '-'}
            {' · '}
            优先级: {product.priority ?? '-'}
            {' · '}
            采集:{' '}
            {wm?.d7 != null ? (
              <>
                {wm.d7.quality_label === 'reliable' ? '可靠' :
                 wm.d7.quality_label === 'limited' ? '有限' :
                 wm.d7.quality_label === 'insufficient' ? '不足' : '-'}
                ({wm.d7.fetch_count ?? '-'}次)
              </>
            ) : '-'}
          </div>
          {product.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.keywords.map(kw => (
                <span key={kw} className="text-xs text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">
                  {kw}
                </span>
              ))}
            </div>
          )}
          {product.daysSincePublish != null && (
            <div className="text-xs text-gray-700">
              上架 {Math.round(product.daysSincePublish)} 天
              {product.publishedAt && `（${new Date(product.publishedAt).toLocaleString('zh-CN')}）`}
            </div>
          )}
          {product.monitorStatus != null && product.monitorStatus !== 1 && (
            <span className="inline-block text-xs font-medium text-red-600 bg-red-50 rounded px-2 py-0.5">
              {product.monitorStatus === 0 ? '已暂停' : product.monitorStatus === 2 ? '已分析' : '已发布'}
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
