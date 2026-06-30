'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ProductItem } from '@/lib/api/selection'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  STATUS_MAP,
  ANOMALY_DISPLAY,
  type AnomalyDisplayCategory,
} from '@/components/selection/product/constants'
import { fmtPrice, fmtPercent, fmtGrowth, fmtNumber } from '@/lib/utils/format'
import { MiniTrendChart } from '@/components/selection/product/MiniTrendChart'

interface ProductFocusCardProps {
  products: ProductItem[]
  isLoading?: boolean
  anomalyMap: Map<string, AnomalyDisplayCategory[]>
  onSelectProduct: (id: string | null) => void
  selectedProductId: string | null
}

export function ProductFocusCard({
  products,
  isLoading,
  anomalyMap,
  onSelectProduct,
  selectedProductId,
}: ProductFocusCardProps) {
  const [index, setIndex] = useState(0)

  // Reset index if it exceeds the current product list
  const safeIndex = Math.min(index, Math.max(0, products.length - 1))

  const goPrev = useCallback(() => {
    setIndex(prev => Math.max(0, prev - 1))
  }, [])

  const goNext = useCallback(() => {
    setIndex(prev => Math.min(products.length - 1, prev + 1))
  }, [products.length])

  const product: ProductItem | undefined = products[safeIndex]
  const anomalyCats = product ? (anomalyMap.get(product.id) ?? []) : []

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // ---- Empty state ----
  if (products.length === 0 || !product) {
    return (
      <EmptyState
        title="暂无监控商品"
        description="请在「关键词采集」中添加关键词并触发采集"
        size="md"
      />
    )
  }

  // ---- Focus card ----
  const s = STATUS_MAP[product.monitorStatus ?? -1]

  return (
    <div className="space-y-4">
      {/* ── 导航栏 ── */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
        <button
          onClick={goPrev}
          disabled={safeIndex === 0}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="上一个商品"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-sm font-medium text-gray-600 tabular-nums">
          {safeIndex + 1} / {products.length}
        </span>

        <button
          onClick={goNext}
          disabled={safeIndex >= products.length - 1}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="下一个商品"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── 商品卡片 ── */}
      <div
        onClick={() => onSelectProduct(product.id === selectedProductId ? null : product.id)}
        className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4 cursor-pointer transition-colors ${
          selectedProductId === product.id ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        {/* ── 头部：描述 + 标题 ── */}
        <div className="space-y-1">
          {product.description ? (
            <p className="text-sm text-gray-800 leading-snug line-clamp-3">
              {product.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">无描述</p>
          )}
          <a
            href={`https://www.goofish.com/item?id=${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-gray-500 font-mono border-b border-dotted border-gray-300"
          >
            {product.id} ↗
          </a>
        </div>

        {/* ── 状态 + 优先级 + 入库 ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {s ? (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}

          {product.priority !== null && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
              ⚡{product.priority}
            </span>
          )}

          {product.shopName && (
            <span className="text-xs text-gray-500">{product.shopName}</span>
          )}
        </div>

        {/* ── 异常标记（显著展示） ── */}
        {anomalyCats.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {anomalyCats.map(cat => {
              const d = ANOMALY_DISPLAY[cat]
              return (
                <span
                  key={cat}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.bg} ${d.text}`}
                >
                  {d.label}
                </span>
              )
            })}
          </div>
        )}

        {/* ── 核心指标行 ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* 价格 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">价格</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              {fmtPrice(product.price)}
            </p>
            {product.priceTrend === 'up' && (
              <p className="text-xs text-green-600 font-semibold">↑提价</p>
            )}
            {product.priceTrend === 'down' && (
              <p className="text-xs text-red-600 font-semibold">↓降价</p>
            )}
          </div>
          {/* 想要 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">想要</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              {fmtNumber(product.wantCount)}
            </p>
          </div>
          {/* 浏览 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">浏览</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              {fmtNumber(product.lookCount)}
            </p>
          </div>
          {/* 7天询单率 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">询单率</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              {fmtPercent(product.d7InquiryRate)}
            </p>
          </div>
          {/* 7天询藏比 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">询藏比</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              {product.d7IfRatio != null ? product.d7IfRatio.toFixed(2) : '-'}
            </p>
          </div>
          {/* 流量增速 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">流量增速</p>
            <p className={`text-sm font-semibold tabular-nums ${
              product.d7BrowseGrowth == null ? 'text-gray-400'
                : product.d7BrowseGrowth > 0 ? 'text-green-600'
                : product.d7BrowseGrowth < 0 ? 'text-red-600'
                : 'text-gray-400'
            }`}>
              {fmtGrowth(product.d7BrowseGrowth)}
            </p>
          </div>
        </div>

        {/* ── 热度指标 ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">日均想要</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              {product.d7DailyWant != null ? product.d7DailyWant.toFixed(1) : '-'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">日均浏览</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              {product.d7DailyLook != null ? product.d7DailyLook.toFixed(1) : '-'}
            </p>
          </div>
        </div>

        {/* ── 趋势迷你图 ── */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500">想要趋势</span>
            <MiniTrendChart
              hourlyData={product.hourlyTrend?.hourly_want_rate?.slice(-21) ?? []}
              slope={(product.trendDirection?.want_slope as 'up' | 'down' | 'flat' | undefined) ?? null}
              dailyAvg={product.d7DailyWant}
              cv={product.wantStability}
              color="amber"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500">浏览趋势</span>
            <MiniTrendChart
              hourlyData={product.hourlyTrend?.hourly_look_rate?.slice(-21) ?? []}
              slope={(product.trendDirection?.look_slope as 'up' | 'down' | 'flat' | undefined) ?? null}
              dailyAvg={product.d7DailyLook}
              cv={product.lookStability}
              color="blue"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500">收藏趋势</span>
            <MiniTrendChart
              hourlyData={product.hourlyTrend?.hourly_collect_rate?.slice(-21) ?? []}
              slope={(product.trendDirection?.collect_slope as 'up' | 'down' | 'flat' | undefined) ?? null}
              dailyAvg={product.d7DailyCollect}
              cv={product.collectStability}
              color="violet"
            />
          </div>
        </div>

        {/* ── 关键词 pills ── */}
        {product.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
            {product.keywords.map(kw => (
              <span
                key={kw}
                className="text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-0.5"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* 点击查看详情提示 */}
        <div className="flex items-center justify-center gap-1 text-xs text-gray-400 pt-1">
          <span>点击卡片查看详情分析</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>

      {/* ── CSS scroll-snap 容器（滑动增强）── */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        当前查看第 {safeIndex + 1} 个商品，共 {products.length} 个
      </div>
    </div>
  )
}
