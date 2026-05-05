'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCategories, getDailyProductCounts, getCategoryProducts, getCategoryReports, Category } from '@/lib/api/selection'
import { TabBar, TabName } from '@/components/selection/TabBar'
import { ReportSubTabs, ReportSubTab } from '@/components/selection/ReportSubTabs'
import { VerticalTimeline } from '@/components/selection/VerticalTimeline'
import { ContentGrid } from '@/components/selection/ContentGrid'
import { ContentList } from '@/components/selection/ContentList'
import { ViewToggle } from '@/components/selection/ViewToggle'
import { ReportCard } from '@/components/selection/ReportCard'
import { ReportControlBar } from '@/components/selection/ReportControlBar'
import { KeywordsConfig } from '@/components/selection/KeywordsConfig'
import { AccountsConfig } from '@/components/selection/AccountsConfig'
import { CollectionConfig } from '@/components/selection/CollectionConfig'
import { AIConfig } from '@/components/selection/AIConfig'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Search, Filter, Tag, Users } from 'lucide-react'

export default function SelectionPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [activeTab, setActiveTab] = useState<TabName>('content')
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [reportSubTab, setReportSubTab] = useState<ReportSubTab>('daily')
  const [selectedDates, setSelectedDates] = useState<string[]>([])

  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ['selection-categories'],
    queryFn: () => listCategories(),
  })

  // 只显示场景分类
  const filteredCategories = useMemo(
    () => allCategories.filter((c) => c.type === 'scene'),
    [allCategories]
  )

  const categoryId = selectedCategory?.id || ''

  const { data: dailyCounts = {} } = useQuery({
    queryKey: ['daily-counts', categoryId],
    queryFn: () => getDailyProductCounts(categoryId),
    enabled: !!categoryId,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products', categoryId],
    queryFn: () => getCategoryProducts(categoryId),
    enabled: !!categoryId,
  })

  const { data: reports = [] } = useQuery({
    queryKey: ['reports', categoryId],
    queryFn: () => getCategoryReports(categoryId),
    enabled: !!categoryId,
  })

  const dates = useMemo(() => Object.keys(dailyCounts).sort(), [dailyCounts])
  const [activeDateIndex, setActiveDateIndex] = useState(0)
  const activeDate = dates[activeDateIndex] || ''

  // 默认选择最新日期
  useEffect(() => {
    if (dates.length > 0) {
      if (selectedDates.length === 0 && activeDateIndex !== dates.length - 1) {
        setActiveDateIndex(dates.length - 1)
      }
      if (activeDateIndex >= dates.length) {
        setActiveDateIndex(dates.length - 1)
      }
    }
  }, [dates, selectedDates, activeDateIndex])

  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${month}/${day}`
  }

  const filteredProducts = useMemo(() => {
    let result = products

    if (searchKeyword) {
      result = result.filter((p) =>
        p.title.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    }

    if (selectedDates.length > 0) {
      result = result.filter(product => {
        const productDate = product.date || '2026-04-14'
        return selectedDates.includes(productDate)
      })
    }

    return result
  }, [products, searchKeyword, selectedDates])

  const selectCategory = (cat: Category) => {
    setSelectedCategory(cat)
    setActiveTab('content')
    setActiveDateIndex(0)
    setSelectedDates([])
  }

  const handleDateToggle = (date: string) => {
    setSelectedDates(prev =>
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date]
    )
  }

  const clearSelectedDates = () => {
    setSelectedDates([])
  }

  const renderCategoryItem = (cat: Category) => {
    const isSelected = selectedCategory?.id === cat.id
    return (
      <button
        key={cat.id}
        onClick={() => selectCategory(cat)}
        className={`w-full text-left p-2.5 rounded-lg transition-all duration-150 ${
          isSelected
            ? 'bg-blue-50 shadow-sm border border-blue-100 transform scale-[1.02]'
            : 'hover:bg-gray-50 hover:shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className={`text-sm font-semibold truncate ${
            isSelected ? 'text-blue-700' : 'text-gray-900'
          }`}>
            {cat.name}
          </h3>
          <span className="text-xs font-bold text-blue-700 whitespace-nowrap">
            {cat.totalCollectCount}件
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <span className="flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" />
              {cat.keywordCount}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-2.5 h-2.5" />
              {cat.accountCount}
            </span>
          </div>
          <span className="font-semibold text-orange-600 whitespace-nowrap">
            今 {cat.todayCollectCount}
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-2 space-y-3">
          <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-200">
            <div className="pb-2.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">关键词列表</h3>
              <p className="text-xs text-gray-400 mt-0.5">选择关键词查看相关商品</p>
            </div>

            <div className="max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar mt-2 space-y-1">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner size="md" />
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-400">暂无关键词</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCategories.map(renderCategoryItem)}
                </div>
              )}
            </div>
          </div>

          <button className="w-full py-2.5 text-sm text-gray-400 hover:text-blue-600 transition-colors text-left pl-2">
            + 新建关键词
          </button>
        </div>

        <div className="col-span-10 bg-white rounded-xl border border-gray-200 shadow-sm p-3.5">
          {!selectedCategory ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="text-4xl mb-4 text-gray-200">📊</div>
              <p className="text-gray-400 text-sm">从左侧选择一个关键词查看详情</p>
            </div>
          ) : (
            <div className="space-y-4">
              <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

              {(activeTab === 'content' || activeTab === 'report') ? (
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-2">
                    <div className="bg-white border-r border-gray-200 p-2 h-full">
                      <VerticalTimeline
                        dates={dates}
                        dataCounts={dailyCounts}
                        activeDate={activeDate}
                        selectedDates={selectedDates}
                        onDateSelect={(date) => {
                          const idx = dates.indexOf(date)
                          if (idx >= 0) setActiveDateIndex(idx)
                        }}
                        onDateToggle={handleDateToggle}
                      />
                    </div>
                  </div>

                  <div className="col-span-10">
                    {selectedDates.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-blue-700 font-medium">
                              按日期筛选中：{selectedDates.length}个日期
                            </span>
                            <span className="text-gray-500 text-xs">
                              {selectedDates.map(d => formatDateLabel(d)).join(', ')}
                            </span>
                          </div>
                          <button
                            onClick={clearSelectedDates}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            清空筛选
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'content' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={searchKeyword}
                              onChange={(e) => setSearchKeyword(e.target.value)}
                              placeholder="搜索商品..."
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                            />
                          </div>
                          <button className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                            <Filter className="w-4 h-4" />
                            筛选
                          </button>
                          <ViewToggle view={view} onChange={setView} />
                        </div>

                        <div className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                          {view === 'grid' ? (
                            <ContentGrid products={filteredProducts} />
                          ) : (
                            <ContentList products={filteredProducts} />
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'report' && (
                      <div className="space-y-4">
                        <ReportSubTabs activeSubTab={reportSubTab} onSubTabChange={setReportSubTab} />

                        {reportSubTab === 'daily' ? (
                          <div className="space-y-4">
                            <ReportControlBar />
                            <div className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                              <div className="space-y-4">
                                {reports.length === 0 ? (
                                  <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                                    <p className="text-gray-400 text-sm">暂无报告，请先生成报告</p>
                                  </div>
                                ) : (
                                  reports.map((report) => <ReportCard key={report.id} report={report} />)
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                              <div className="bg-white rounded-xl shadow-sm p-6">
                                <h3 className="font-medium text-gray-900 mb-4">选品汇总</h3>
                                <p className="text-sm text-gray-500">从采集商品中精选的高潜力商品将展示在这里。</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                    <div className="space-y-5">
                      <KeywordsConfig />
                      <AccountsConfig />
                      <CollectionConfig />
                      <AIConfig />
                    </div>
                  </div>
                  <div className="flex justify-end pt-5 border-t border-gray-100">
                    <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all">
                      保存配置
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}