"use client"

import { useState, useRef, useEffect } from "react"
import type { Item } from "@/lib/api/items"
import type { AccountName } from "@/lib/api/accounts"
import type { ConfigField } from "@/components/items/config"
import { FilterBar } from "@/components/items/FilterBar"
import { ItemRow } from "@/components/items/views/ItemRow"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { ItemEditDrawer } from "@/components/items/drawers/ItemEditDrawer"
import { KeywordDrawer } from "@/components/items/drawers/RulesItemsingleDrawer"
import { ConfigDrawer } from "@/components/items/drawers/ConfigDrawer"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface ItemsTabProps {
  isMobile: boolean
  accountsData: AccountName[] | undefined
  searchInput: { uid: string; title: string; gid: string }
  filters: { status?: number; uid?: string }
  stats: { total: number; onSale: number; offSale: number; sold: number; deliveryConfigured: number }
  orderBy: string | null
  asc: boolean
  page: number
  totalPages: number
  totalItems: number
  isRefreshing: boolean
  onSearchChange: (updater: (prev: { uid: string; title: string; gid: string }) => { uid: string; title: string; gid: string }) => void
  onStatusChange: (status: number | undefined) => void
  onRefresh: () => void
  onClearFilters: () => void
  onSortChange: (field: string) => void
  onPageChange: (page: number) => void
  data: Item[] | undefined
  itemKeywordCounts: Record<string, number>
  isLoading: boolean
  error: unknown
  onToggle: (item: Item, field: string) => void
  updateMutation: { mutate: (args: { gid: string; data: Record<string, unknown> }) => void }
}

export function ItemsTab({
  isMobile,
  accountsData,
  searchInput,
  filters,
  stats,
  orderBy,
  asc,
  page,
  totalPages,
  totalItems,
  isRefreshing,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onClearFilters,
  onSortChange,
  onPageChange,
  data,
  itemKeywordCounts,
  isLoading,
  error,
  onToggle,
  updateMutation,
}: ItemsTabProps) {
  // — 抽屉状态（内部管理）——
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [keywordItem, setKeywordItem] = useState<Item | null>(null)
  const [mobileConfig, setMobileConfig] = useState<{ item: Item; field: ConfigField } | null>(null)

  // — 列表滚动 ref，翻页时滚回顶部 —
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [page])

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* 桌面端统计概览 */}
        <div className="hidden md:grid grid-cols-4 gap-4 p-4 border-b border-gray-100">
          <div className="rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500">在售数量</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">{stats.onSale}</p>
          </div>
          <div className="rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500">仓库数量</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">{stats.offSale}</p>
          </div>
          <div className="rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500">售出数量</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">{stats.sold}</p>
          </div>
          <div className="rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500">自动发货</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">{stats.deliveryConfigured}</p>
          </div>
        </div>

        {/* 筛选栏 — 桌面端与移动端统一位置 */}
        <FilterBar
          accounts={accountsData || []}
          searchInput={searchInput}
          statusFilter={filters.status}
          onSearchChange={onSearchChange}
          onStatusChange={onStatusChange}
          onRefresh={onRefresh}
          onClear={onClearFilters}
          isRefreshing={isRefreshing}
          selectedUid={filters.uid}
          stats={stats}
          orderBy={orderBy}
          asc={asc}
          onSortChange={onSortChange}
        />

        {/* 加载/错误/空状态 */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}
        {!!error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-4">
            加载商品列表失败: {String(error)}
          </div>
        )}
        {!isLoading && !error && data && data.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center m-4">
            <h3 className="text-lg font-medium text-gray-900 mb-1">暂无商品</h3>
            <p className="text-sm text-gray-500">没有找到符合条件的商品</p>
          </div>
        )}

        {!isLoading && !error && data && data.length > 0 && (
          <>
            {/* === 桌面端表格 === */}
            <div ref={listRef} className="flex-1 overflow-auto hidden md:block" style={{ minHeight: "200px" }}>
              {/* 表头 */}
              <div
                className="sticky top-0 z-10 grid gap-2 px-4 py-3 bg-gray-100 border-b border-gray-100 text-xs font-medium text-gray-600"
                style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
              >
                <div className="col-span-2">
                  <span>商品信息</span>
                </div>
                <div className="col-span-1 text-right">
                  <span>价格</span>
                </div>
                <div className="col-span-1 text-center">
                  <span>发布时间</span>
                </div>
                {/* <div className="col-span-1 text-center">数据</div> */}
                <div className="col-span-1 text-center">AI回复</div>
                <div className="col-span-1 text-center">自动发货</div>
                <div className="col-span-1 text-center">付款后发货</div>
                <div className="col-span-1 text-center">收货后赠送</div>
                <div className="col-span-1 text-center">评价后赠送</div>
                <div className="col-span-1 text-center">关键词回复</div>
                <div className="col-span-1 text-center">AI提示词</div>
                <div className="col-span-1 text-center">自动上架</div>
                <div className="col-span-1 text-center">指令码</div>
              </div>

              {/* 内容区域 */}
              {data.map((item, index) => (
                <ItemRow
                  key={item.gid}
                  item={item}
                  isEven={index % 2 === 0}
                  onToggle={onToggle}
                  onEdit={() => setEditingItem(item)}
                  onKeywordClick={() => setKeywordItem(item)}
                  keywordCount={itemKeywordCounts[item.gid] || 0}
                  onUpdateField={(gid, field, value) =>
                    updateMutation.mutate({ gid, data: { [field]: value } })
                  }
                />
              ))}
            </div>

            {/* === 移动端卡片列表 === */}
            <div className="flex-1 overflow-auto md:hidden px-1 pb-3 space-y-2.5" style={{ minHeight: "200px" }}>
              {data.map((item) => (
                <MobileProductCard
                  key={item.gid}
                  item={item}
                  keywordCount={itemKeywordCounts[item.gid] || 0}
                  onToggle={onToggle}
                  onEdit={() => setEditingItem(item)}
                  onKeywordClick={() => setKeywordItem(item)}
                  onConfigClick={(field) => setMobileConfig({ item, field })}
                  onSendCodeChange={(gid, value) => updateMutation.mutate({ gid, data: { sendCode: value } })}
                />
              ))}
            </div>
          </>
        )}

        {/* 分页器 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-3 border-t border-gray-100">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className={`text-sm px-3 py-1 rounded-lg ${
                page <= 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-blue-600 hover:bg-blue-50 cursor-pointer"
              }`}
            >
              ← 上一页
            </button>
            <span className="text-sm text-gray-500">
              共 {totalItems} 件，{page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className={`text-sm px-3 py-1 rounded-lg ${
                page >= totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-blue-600 hover:bg-blue-50 cursor-pointer"
              }`}
            >
              下一页 →
            </button>
          </div>
        )}

      {/* ==== 抽屉（内部调度）==== */}

      {/* 编辑商品 */}
      {editingItem && (
        <ItemEditDrawer
          item={editingItem}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => setEditingItem(null)}
        />
      )}

      {/* 关键词回复 */}
      {keywordItem && (
        <KeywordDrawer
          item={keywordItem}
          open={!!keywordItem}
          onClose={() => setKeywordItem(null)}
        />
      )}

      {/* 配置编辑 */}
      {mobileConfig && (
        <ConfigDrawer
          open={!!mobileConfig}
          item={mobileConfig.item}
          field={mobileConfig.field}
          onClose={() => setMobileConfig(null)}
          onSave={(gid, field, value) => {
            updateMutation.mutate({ gid, data: { [field]: value } })
            setMobileConfig(null)
          }}
        />
      )}
    </div>
  )
}
