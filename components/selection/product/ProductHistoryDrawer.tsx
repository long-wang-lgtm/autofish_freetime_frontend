'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sheet } from '@/components/ui/Sheet'
import { TrendChart } from '@/components/selection/product/TrendChart'
import { getProductHistory, type ProductItem } from '@/lib/api/selection'
import { RotateCcw } from 'lucide-react'

interface ProductHistoryDrawerProps {
  /** 选中的商品 GID，null 时不渲染 Sheet */
  gid: string | null
  /** 选中的商品信息（列表行数据），用于头部展示 */
  product: ProductItem | null
  /** 关闭回调 */
  onClose: () => void
}

type TimeRange = 7 | 30 | 90

const TIME_RANGE_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: 7, label: '7天' },
  { key: 30, label: '30天' },
  { key: 90, label: '90天' },
]

export function ProductHistoryDrawer({ gid, product, onClose }: ProductHistoryDrawerProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(7)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product-history', gid, timeRange],
    queryFn: () => getProductHistory(gid!, timeRange),
    enabled: !!gid,
  })

  const open = !!gid

  // 计算稳定性指标
  const inquiryValues = data?.items.map(d => d.inquiryCount) || []
  const mean = inquiryValues.length > 0 ? inquiryValues.reduce((a, b) => a + b, 0) / inquiryValues.length : 0
  const variance = inquiryValues.length > 0
    ? inquiryValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / inquiryValues.length
    : 0
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0

  // 转化率 CV
  const conversionRates = data?.items.map(d =>
    d.inquiryCount > 0 ? d.favoriteCount / d.inquiryCount : null
  ).filter(Boolean) as number[] || []
  const convMean = conversionRates.length > 0 ? conversionRates.reduce((a, b) => a + b, 0) / conversionRates.length : 0
  const convVariance = conversionRates.length > 0
    ? conversionRates.reduce((sum, v) => sum + (v - convMean) ** 2, 0) / conversionRates.length
    : 0
  const convCv = convMean > 0 ? Math.sqrt(convVariance) / convMean : 0

  // 汇总计算
  const totalInquiry = inquiryValues.reduce((a, b) => a + b, 0)
  const avgDailyInquiry = timeRange > 0 ? totalInquiry / timeRange : 0
  const avgConversion = conversionRates.length > 0
    ? conversionRates.reduce((a, b) => a + b, 0) / conversionRates.length
    : 0

  const firstInquiry = inquiryValues[0] || 0
  const lastInquiry = inquiryValues[inquiryValues.length - 1] || 0
  const trendPct = firstInquiry > 0 ? ((lastInquiry - firstInquiry) / firstInquiry) * 100 : 0
  const trendDirection = trendPct > 1 ? 'up' : trendPct < -1 ? 'down' : 'flat'

  const cvLabel = cv <= 0.3 ? '稳定' : cv <= 0.6 ? '一般' : '波动'
  const cvColor = cv <= 0.3 ? 'text-green-600 bg-green-50' : cv <= 0.6 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'

  const convCvLabel = convCv <= 0.3 ? '稳定' : convCv <= 0.6 ? '一般' : '波动'
  const convCvColor = convCv <= 0.3 ? 'text-green-600 bg-green-50' : convCv <= 0.6 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={product ? `${product.description || product.title || '商品'} / ${gid}` : ''}
      width="520px"
    >
      <div className="p-4 space-y-5 overflow-y-auto h-full">
        {/* 时间范围切换 */}
        <div className="flex items-center gap-1.5">
          {TIME_RANGE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setTimeRange(opt.key)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timeRange === opt.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 错误态 */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-gray-500">数据加载失败</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> 重试
            </button>
          </div>
        )}

        {/* 加载态 */}
        {isLoading && !isError && (
          <div className="space-y-4">
            <div className="h-56 bg-gray-100 animate-pulse rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
              <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
            </div>
            <div className="h-28 bg-gray-100 animate-pulse rounded-lg" />
          </div>
        )}

        {/* 数据态 */}
        {!isLoading && !isError && (
          <>
            {!data || data.items.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                该商品暂无历史采集数据
              </div>
            ) : (
              <>
                {/* 询单趋势图 */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">询单趋势</h4>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <TrendChart
                      data={data.items}
                      type="inquiry"
                      showMA={data.items.length >= 14}
                    />
                  </div>
                </div>

                {/* 转化率趋势图 */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">转化率趋势</h4>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <TrendChart
                      data={data.items}
                      type="conversion"
                    />
                  </div>
                </div>

                {/* 稳定性指标 */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">稳定性指标</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">询单稳定性</p>
                      <p className="text-lg font-semibold text-gray-900">CV {cv.toFixed(2)}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cvColor}`}>
                        {cvLabel}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">转化稳定性</p>
                      <p className="text-lg font-semibold text-gray-900">CV {convCv.toFixed(2)}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${convCvColor}`}>
                        {convCvLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 汇总区 */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">数据汇总</h4>
                  <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-x-6 gap-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">时间段总询单</span>
                      <span className="text-xs font-semibold text-gray-900">{totalInquiry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">日均询单</span>
                      <span className="text-xs font-semibold text-gray-900">{avgDailyInquiry.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">询单→收藏转化率均值</span>
                      <span className="text-xs font-semibold text-gray-900">{(avgConversion * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">询单趋势方向</span>
                      <span className={`text-xs font-semibold ${
                        trendDirection === 'up' ? 'text-green-600' : trendDirection === 'down' ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'} {Math.abs(trendPct).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}
