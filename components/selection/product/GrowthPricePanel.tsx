'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ProductItem } from '@/lib/api/selection'

interface GrowthPricePanelProps {
  product: ProductItem | null
}

function fmtPrice(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
}

function fmtCount(v: number): string {
  return v.toLocaleString('zh-CN')
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 tabular-nums">{value}</span>
    </div>
  )
}

export function GrowthPricePanel({ product }: GrowthPricePanelProps) {
  const [open, setOpen] = useState(false)

  if (!product) return null

  const wm = product.windowsMetrics
  const d7 = wm?.d7

  return (
    <div className="border-t border-gray-100 pt-3">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
      >
        <span>基础数据</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5" />
          : <ChevronRight className="w-3.5 h-3.5" />
        }
      </button>

      {open && (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <Row label="价格" value={fmtPrice(product.price)} />
          <Row label="累计浏览" value={fmtCount(product.lookCount)} />
          <Row label="累计想要" value={fmtCount(product.wantCount)} />
          <Row label="商品状态" value={
            product.monitorStatus != null
              ? { 0: '在售', 1: '在售', 2: '已售', 3: '已发布' }[product.monitorStatus] ?? '-'
              : '-'
          } />
          <Row label="7天浏览增速" value={
            d7?.browse_growth != null ? `${(d7.browse_growth * 100).toFixed(1)}%` : '-'
          } />
          <Row label="7天询单增量" value={d7?.total_dwant != null ? String(d7.total_dwant) : '-'} />
          <Row label="7天浏览增量" value={d7?.total_dlook != null ? String(d7.total_dlook) : '-'} />
          <Row label="7天收藏增量" value={d7?.total_dcollect != null ? String(d7.total_dcollect) : '-'} />
          <Row label="全局日均询单" value={product.dailyWant?.toFixed(1) ?? '-'} />
          <Row label="上架天数" value={product.daysSincePublish?.toFixed(0) ?? '-'} />
          <Row label="上架时间" value={
            product.publishedAt
              ? new Date(product.publishedAt).toISOString().split('T')[0]
              : '-'
          } />
          <Row label="预估订单" value={product.estimatedOrders?.toFixed(0) ?? '-'} />
          <Row label="预估销售额" value={product.estimatedSales != null ? fmtPrice(product.estimatedSales) : '-'} />
          <Row label="价格趋势" value={
            d7?.price_trend === 'up' ? '↑ 提价' :
            d7?.price_trend === 'down' ? '↓ 降价' :
            d7?.price_trend === 'flat' ? '→ 平稳' : '-'
          } />
          <Row label="最低价比" value={d7?.price_lowest_ratio?.toFixed(2) ?? '-'} />
          <Row label="采集次数" value={d7?.fetch_count?.toString() ?? '-'} />
          <Row label="质量" value={
            d7?.quality_label === 'reliable' ? '可靠' :
            d7?.quality_label === 'limited' ? '有限' :
            d7?.quality_label === 'insufficient' ? '不足' : '-'
          } />
        </div>
      )}
    </div>
  )
}
