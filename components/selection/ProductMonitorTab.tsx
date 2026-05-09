'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listMonitorItems, removeMonitorItem } from '@/lib/api/selection'
import { ContentList } from './ContentList'
import { ContentGrid } from './ContentGrid'
import { ViewToggle } from './ViewToggle'
import { Search, Filter } from 'lucide-react'

export function ProductMonitorTab() {
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [searchText, setSearchText] = useState('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['monitor-items'],
    queryFn: listMonitorItems,
  })

  const handleRemove = async (gid: string) => {
    await removeMonitorItem(gid)
  }

  // 将 DTO 映射为 ProductItem 格式供列表使用
  const products = useMemo(() => items.map(item => ({
    id: item.gid,
    title: item.keyword || item.gid,
    price: item.price || 0,
    imageUrl: '/placeholder.png',
    wantCount: item.want_count,
    lookCount: item.look_count,
    ratio: item.want_count / (item.look_count || 1),
    collectCount: item.collect_count,
    shopName: '',
    source: `关键词[${item.keyword}]`,
    sourceType: 'keyword' as const,
    publishedAt: item.last_fetch_time || '',
    description: '',
  })), [items])

  const filtered = useMemo(() => {
    if (!searchText) return products
    return products.filter(p => p.title.toLowerCase().includes(searchText.toLowerCase()))
  }, [products, searchText])

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="搜索商品..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            筛选
          </button>
          <ViewToggle view={view} onChange={setView} />
          <div className="ml-auto text-sm text-gray-500">
            监控中: {items.length} 件商品
          </div>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <p className="text-center py-8 text-gray-400">加载中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-gray-400">
              {searchText ? '无匹配商品' : '暂无监控商品，请先在关键词采集中添加并触发采集'}
            </p>
          ) : view === 'grid' ? (
            <ContentGrid products={filtered} />
          ) : (
            <ContentList products={filtered} />
          )}
        </div>
      </div>

      {/* AI 分析报告 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">AI 商品分析报告</h3>
        <p className="text-sm text-gray-500 text-center py-4">
          基于监控商品的 AI 潜力分析报告将展示在这里
        </p>
      </div>
    </div>
  )
}
