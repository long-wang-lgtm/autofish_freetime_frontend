"use client"

import { useState, useRef, useEffect } from "react"
import type { Item } from "@/lib/api/items"
import type { ConfigField } from "@/components/items/config"
import { ItemRow, ITEMS_GRID_COLS } from "@/components/items/views/ItemRow"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { ItemEditDrawer } from "@/components/items/drawers/ItemEditDrawer"
import { KeywordDrawer } from "@/components/items/drawers/RulesItemsingleDrawer"
import { ConfigDrawer } from "@/components/items/drawers/ConfigDrawer"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorBanner } from "@/components/ui/ErrorBanner"
import { EmptyState } from "@/components/ui/EmptyState"
import { Pagination } from "@/components/ui/pagination"

interface ItemsTabProps {
  isMobile: boolean
  data: Item[] | undefined
  isLoading: boolean
  error: unknown
  itemKeywordCounts: Record<string, number>
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onRetry: () => void
  onToggle: (item: Item, field: string) => void
  updateMutation: { mutate: (args: { gid: string; data: Record<string, unknown> }) => void }
}

export function ItemsTab({
  isMobile,
  data,
  isLoading,
  error,
  itemKeywordCounts,
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onRetry,
  onToggle,
  updateMutation,
}: ItemsTabProps) {
  // — 抽屉状态（内部管理）—
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
      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* 错误状态 */}
      {!!error && !isLoading && (
        <ErrorBanner
          message={`加载商品列表失败: ${String(error)}`}
          variant="banner"
          onRetry={onRetry}
        />
      )}

      {/* 空状态 */}
      {!isLoading && !error && data && data.length === 0 && (
        <EmptyState
          title="暂无商品"
          description="没有找到符合条件的商品"
        />
      )}

      {/* 数据列表 */}
      {!isLoading && !error && data && data.length > 0 && (
        <>
          {/* === 桌面端表格 === */}
          <div ref={listRef} className="flex-1 overflow-auto hidden md:block min-h-[200px]">
            {/* 表头 */}
            <div
              className="sticky top-0 z-10 grid gap-2 px-4 py-3 bg-gray-100 border-b border-gray-100 text-xs font-medium text-gray-600"
              style={{ gridTemplateColumns: ITEMS_GRID_COLS }}
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
          <div className="flex-1 overflow-auto md:hidden pb-3 space-y-2 min-h-[200px]">
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
      <Pagination
        page={page}
        total={totalItems}
        pageSize={pageSize}
        onChange={onPageChange}
      />

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
