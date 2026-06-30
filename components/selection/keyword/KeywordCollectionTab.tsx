'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listKeywords, addKeyword, removeKeyword, getCategoryProducts, getDailyProductCounts, triggerCollection } from '@/lib/api/selection'
import { NewKeywordModal } from './NewKeywordModal'
import { VerticalTimeline } from './VerticalTimeline'
import { Eye, Heart, Search, Play } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { fmtNumber } from '@/lib/utils/format'

interface KeywordCollectionTabProps {
  selectedKeywordId: string | null
  onSelectKeyword: (id: string | null) => void
}

export function KeywordCollectionTab({ selectedKeywordId, onSelectKeyword }: KeywordCollectionTabProps) {
  const [showNewKeywordModal, setShowNewKeywordModal] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [triggering, setTriggering] = useState(false)
  const queryClient = useQueryClient()

  // 关键词列表
  const { data: keywords = [], isLoading: keywordsLoading } = useQuery({
    queryKey: ['selection-keywords'],
    queryFn: listKeywords,
  })

  // 采集统计（按日期）
  const { data: dailyCounts = {} } = useQuery({
    queryKey: ['daily-counts-keyword'],
    queryFn: () => getDailyProductCounts(''),
    enabled: true,
  })

  // 当前选中关键词的商品列表
  const { data: products = [] } = useQuery({
    queryKey: ['keyword-products', selectedKeywordId],
    queryFn: () => getCategoryProducts(selectedKeywordId || ''),
    enabled: !!selectedKeywordId,
  })

  const dates = useMemo(() => Object.keys(dailyCounts).sort(), [dailyCounts])
  const [activeDateIndex, setActiveDateIndex] = useState(0)

  const handleAddKeyword = async (keyword: string) => {
    await addKeyword(keyword)
    queryClient.invalidateQueries({ queryKey: ['selection-keywords'] })
  }

  const handleRemoveKeyword = async (id: number) => {
    await removeKeyword(id)
    queryClient.invalidateQueries({ queryKey: ['selection-keywords'] })
    if (selectedKeywordId === String(id)) onSelectKeyword(null)
  }

  const handleTrigger = async () => {
    setTriggering(true)
    try {
      const ids = selectedKeywordId ? [selectedKeywordId] : []
      await triggerCollection(ids)
    } finally {
      setTriggering(false)
    }
  }

  const filteredKeywords = useMemo(() => {
    if (!searchText) return keywords
    return keywords.filter(k => (k.keyword ?? '').toLowerCase().includes(searchText.toLowerCase()))
  }, [keywords, searchText])

  return (
    <div className="grid grid-cols-12 gap-3">
      {/* 左侧：关键词列表 */}
      <div className="col-span-2 space-y-3">
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-200">
          <div className="pb-2 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">关键词列表</h3>
            <p className="text-xs text-gray-400 mt-0.5">管理搜索关键词</p>
          </div>

          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="搜索关键词"
              className="w-full pl-8 pr-3 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div className="max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar mt-2 space-y-1">
            {keywordsLoading ? (
              <div className="flex justify-center py-6"><LoadingSpinner size="md" /></div>
            ) : filteredKeywords.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">暂无关键词</p>
            ) : (
              filteredKeywords.map(kw => (
                <button
                  key={kw.id}
                  onClick={() => onSelectKeyword(kw.id != null ? String(kw.id) : null)}
                  className={`w-full text-left p-2 rounded-lg text-xs transition-all ${
                    selectedKeywordId === String(kw.id)
                      ? 'bg-blue-50 border border-blue-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate font-medium text-gray-900">{kw.keyword}</span>
                    <button
                      onClick={e => { e.stopPropagation(); if (kw.id != null) handleRemoveKeyword(kw.id) }}
                      className="text-gray-400 hover:text-red-500 ml-1"
                    >×</button>
                  </div>
                  <div className="text-gray-400 mt-0.5">
                    采集 {kw.search_item_counts ?? 0} / AI通过 {kw.total_pass_item_counts ?? 0}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => setShowNewKeywordModal(true)}
          className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-center"
        >
          + 新建关键词
        </button>

        {/* 手动触发采集 */}
        <button
          onClick={handleTrigger}
          disabled={triggering || keywords.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" />
          {triggering ? '采集中...' : '触发采集'}
        </button>
      </div>

      {/* 右侧：时间轴 + 商品 + AI报告 */}
      <div className="col-span-10 space-y-3">
        <div className="grid grid-cols-12 gap-3">
          {/* 时间轴 */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-2">
            <VerticalTimeline
              dates={dates}
              dataCounts={dailyCounts}
              activeDate={dates[activeDateIndex] || ''}
              selectedDates={[]}
              onDateSelect={date => setActiveDateIndex(dates.indexOf(date))}
              onDateToggle={() => {}}
            />
          </div>

          {/* 商品列表 */}
          <div className="col-span-10 bg-white rounded-xl border border-gray-200 p-3">
            <h3 className="font-semibold text-gray-900 mb-3">采集商品</h3>
            <div className="max-h-[calc(100vh-380px)] overflow-y-auto custom-scrollbar">
              {products.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">选择关键词查看采集结果</p>
              ) : (
                <div className="space-y-0.5">
                  {products.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center gap-4 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {/* 商品信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900">
                          {('title' in p ? p.title : '') || p.id}
                        </div>
                        <div className="truncate text-xs text-gray-400 mt-0.5">
                          {('description' in p ? (p as any).description : '') || ''}
                        </div>
                      </div>
                      {/* 价格 */}
                      {'price' in p && (
                        <span className="text-sm font-semibold text-orange-600 tabular-nums w-20 text-right">
                          ¥{p.price}
                        </span>
                      )}
                      {/* 浏览 */}
                      {'lookCount' in p && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 tabular-nums w-16 justify-end">
                          <Eye className="w-3 h-3" />
                          {fmtNumber(p.lookCount)}
                        </span>
                      )}
                      {/* 收藏 */}
                      {'collectCount' in p && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 tabular-nums w-16 justify-end">
                          <Heart className="w-3 h-3" />
                          {fmtNumber(p.collectCount)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI 分析报告区域 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">AI 选品分析报告</h3>
          <div className="text-sm text-gray-500">
            {selectedKeywordId ? (
              <p className="text-center py-4">暂无报告，请先触发采集生成 AI 分析</p>
            ) : (
              <p className="text-center py-4 text-gray-400">选择关键词后查看 AI 分析报告</p>
            )}
          </div>
        </div>
      </div>

      {showNewKeywordModal && (
        <NewKeywordModal
          onClose={() => setShowNewKeywordModal(false)}
          onAdd={handleAddKeyword}
        />
      )}
    </div>
  )
}
