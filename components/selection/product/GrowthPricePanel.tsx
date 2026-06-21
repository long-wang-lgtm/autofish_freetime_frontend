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

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium tabular-nums ${valueClass ?? 'text-gray-800'}`}>{value}</span>
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
        <span>💡 基础数据</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5" />
          : <ChevronRight className="w-3.5 h-3.5" />
        }
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {/* 💰 商业表现 + 📈 流量周期 两列 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {/* 左列：💰 商业表现 */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                💰 商业表现
              </div>
              <Row label="上架日期" value={
                product.publishedAt
                  ? new Date(product.publishedAt).toISOString().split('T')[0]
                  : '-'
              } />
              <Row label="上架天数" value={product.daysSincePublish?.toFixed(0) ?? '-'} />
              <Row label="全局日均询单" value={product.dailyWant?.toFixed(1) ?? '-'} />
              <Row label="价格" value={fmtPrice(product.price)} />
              <Row label="价格趋势" value={
                d7?.price_trend === 'up' ? '↑ 提价' :
                d7?.price_trend === 'down' ? '↓ 降价' :
                d7?.price_trend === 'flat' ? '→ 平稳' : '-'
              } />
              <Row label="最低价比" value={d7?.price_lowest_ratio?.toFixed(2) ?? '-'} />
              <Row label="预估订单" value={product.estimatedOrders != null ? fmtCount(Math.round(product.estimatedOrders)) : '-'} />
              <Row label="预估销售额" value={product.estimatedSales != null ? fmtPrice(product.estimatedSales) : '-'} />
            </div>

            {/* 右列：📈 流量周期 */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                📈 流量周期
              </div>
              <Row label="窗口日均询单" value={
                d7?.total_dwant != null ? (d7.total_dwant / 7).toFixed(1) : '-'
              } />
              <Row label="7天浏览增速" value={
                d7?.browse_growth != null ? `${(d7.browse_growth * 100).toFixed(1)}%` : '-'
              } />
              <Row label="7天询单增量" value={d7?.total_dwant != null ? fmtCount(d7.total_dwant) : '-'} />
              <Row label="7天浏览增量" value={d7?.total_dlook != null ? fmtCount(d7.total_dlook) : '-'} />
              <Row label="7天收藏增量" value={d7?.total_dcollect != null ? fmtCount(d7.total_dcollect) : '-'} />
            </div>
          </div>

          {/* 📊 采集质量（跨两列） */}
          <div className="border-t border-gray-100 pt-2">
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              📊 采集质量
            </div>
            <div className="flex gap-6 text-[11px]">
              <span className="text-gray-600">
                质量标签{' '}
                <span className="font-medium text-gray-800">
                  {d7?.quality_label === 'reliable' ? '可靠' :
                   d7?.quality_label === 'limited' ? '有限' :
                   d7?.quality_label === 'insufficient' ? '不足' : '-'}
                </span>
              </span>
              <span className="text-gray-600">
                采集次数{' '}
                <span className="font-medium text-gray-800">
                  {d7?.fetch_count?.toString() ?? '-'}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
