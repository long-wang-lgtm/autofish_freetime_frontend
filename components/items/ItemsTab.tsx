"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Truck, Upload } from "lucide-react"
import type { Item } from "@/lib/api/items"
import type { ConfigField } from "@/components/items/config"
import { formatPublishTime } from "@/components/items/config"
import { ITEMS_GRID_COLS } from "@/components/items/views/ItemRow"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { ItemEditDrawer } from "@/components/items/drawers/ItemEditDrawer"
import { KeywordDrawer } from "@/components/items/drawers/RulesItemsingleDrawer"
import { ConfigDrawer } from "@/components/items/drawers/ConfigDrawer"
import { IconToggle } from "@/components/items/parts/IconToggle"
import { SendCodeEditor } from "@/components/items/parts/SendCodeEditor"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { ShelfActions } from "@/components/items/parts/ShelfActions"

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
  shelfMutation: {
    mutate: (args: { gid: string; uid: string; action: "shelves" | "offline" }) => void
    isPending: boolean
    variables?: { gid: string; uid: string; action: "shelves" | "offline" }
  }
  orderBy: string | null
  asc: boolean
  onSortChange: (field: string) => void
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
  shelfMutation,
  orderBy,
  asc,
  onSortChange,
}: ItemsTabProps) {
  // — 抽屉状态（内部管理）—
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [keywordItem, setKeywordItem] = useState<Item | null>(null)
  const [mobileConfig, setMobileConfig] = useState<{ item: Item; field: ConfigField } | null>(null)

  // — 上架/下架：仅锁定当前正在请求的那一行 —
  const isShelfPending = (item: Item) =>
    shelfMutation.isPending && shelfMutation.variables?.gid === item.gid

  // — 列表滚动 ref，翻页时滚回顶部 —
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [page])

  // — 排序适配：DataTable 内部封装三态逻辑，传出 field | null —
  // — null = 取消排序，此时传当前 orderBy 给父组件，父组件已有三态逻辑处理取消 —
  const handleSortChange = (field: string | null) => {
    if (field === null) {
      if (orderBy) onSortChange(orderBy)
    } else {
      onSortChange(field)
    }
  }

  // — 桌面端列定义 —
  const columns: DataTableColumn<Item>[] = [
    {
      key: 'title',
      header: '商品信息',
      sortable: true,
      className: 'col-span-2 min-w-0',
      render: (item) => (
        <div className="min-w-0">
          <span
            className="text-left block w-full text-sm text-gray-800 dark:text-gray-200 leading-snug truncate"
            title={item.title || '无标题'}
          >
            {item.title || '无标题'}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 text-gray-400 text-xs">
            <span title={item.account.uid} className="truncate ">{item.account.name}</span>
            <span className="text-gray-300">|</span>
            <span title={item.gid} className="min-w-[85px] truncate">{item.gid}</span>
            <span className="text-gray-300">|</span>
            <ShelfActions
              item={item}
              variant="desktop"
              pending={isShelfPending(item)}
              onShelve={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "shelves" })}
              onOffline={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "offline" })}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: '价格',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-orange-600 font-semibold">¥{item.price}</span>
      ),
    },
    {
      key: 'publishTime',
      header: '发布时间',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-xs text-gray-500">{formatPublishTime(item.publishTime)}</span>
      ),
    },
    {
      key: 'auto_ai_reply',
      header: 'AI回复',
      align: 'center',
      render: (item) => (
        <IconToggle
          active={item.auto_ai_reply}
          activeClass="text-purple-500 bg-purple-50"
          title={item.auto_ai_reply ? 'AI回复：开' : 'AI回复：关'}
          onClick={() => onToggle(item, 'auto_ai_reply')}
        >
          <Bot className="w-4 h-4" />
        </IconToggle>
      ),
    },
    {
      key: 'auto_delivery',
      header: '自动发货',
      align: 'center',
      render: (item) => (
        <IconToggle
          active={item.auto_delivery}
          activeClass="text-green-500 bg-green-50"
          title={item.auto_delivery ? '自动发货：开' : '自动发货：关'}
          onClick={() => onToggle(item, 'auto_delivery')}
        >
          <Truck className="w-4 h-4" />
        </IconToggle>
      ),
    },
    {
      key: 'deliveryContent',
      header: '付款后发货',
      align: 'center',
      render: (item) => {
        const value = item.deliveryContent || ''
        const hasValue = value.trim().length > 0
        return (
          <button
            onClick={() => setMobileConfig({ item, field: 'deliveryContent' })}
            className={`text-xs ${hasValue ? 'text-blue-600' : 'text-gray-400'} hover:underline`}
            title={value || '点击配置'}
          >
            {hasValue ? '已配置' : '未配置'}
          </button>
        )
      },
    },
    {
      key: 'receiptAfter',
      header: '收货后赠送',
      align: 'center',
      render: (item) => {
        const value = item.receiptAfter || ''
        const hasValue = value.trim().length > 0
        return (
          <button
            onClick={() => setMobileConfig({ item, field: 'receiptAfter' })}
            className={`text-xs ${hasValue ? 'text-blue-600' : 'text-gray-400'} hover:underline`}
            title={value || '点击配置'}
          >
            {hasValue ? '已配置' : '未配置'}
          </button>
        )
      },
    },
    {
      key: 'positiveReviewAfter',
      header: '评价后赠送',
      align: 'center',
      render: (item) => {
        const value = item.positiveReviewAfter || ''
        const hasValue = value.trim().length > 0
        return (
          <button
            onClick={() => setMobileConfig({ item, field: 'positiveReviewAfter' })}
            className={`text-xs ${hasValue ? 'text-blue-600' : 'text-gray-400'} hover:underline`}
            title={value || '点击配置'}
          >
            {hasValue ? '已配置' : '未配置'}
          </button>
        )
      },
    },
    {
      key: 'keywordCount',
      header: '关键词回复',
      align: 'center',
      render: (item) => {
        const count = itemKeywordCounts[item.gid] || 0
        return (
          <button
            onClick={() => setKeywordItem(item)}
            className={`text-xs font-medium ${
              count > 0
                ? 'text-blue-600 hover:text-blue-800'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {count > 0 ? `${count}条规则` : '未配置'}
          </button>
        )
      },
    },
    {
      key: 'aiReplyItemPrompt',
      header: 'AI提示词',
      align: 'center',
      render: (item) => {
        const value = item.ai_reply_item_prompt || ''
        const hasValue = value.trim().length > 0
        return (
          <button
            onClick={() => setMobileConfig({ item, field: 'ai_reply_item_prompt' })}
            className={`text-xs ${hasValue ? 'text-blue-600' : 'text-gray-400'} hover:underline`}
            title={value || '点击配置'}
          >
            {hasValue ? '已配置' : '未配置'}
          </button>
        )
      },
    },
    {
      key: 'auto_restock',
      header: '自动上架',
      align: 'center',
      render: (item) => {
        const disabled = item.account.isPro && !item.auto_restock
        return (
          <IconToggle
            active={item.auto_restock}
            activeClass="text-teal-500 bg-teal-50"
            disabled={disabled}
            title={
              disabled
                ? 'Pro 账号不支持自动上架'
                : item.auto_restock
                  ? '自动上架：开'
                  : '自动上架：关'
            }
            onClick={() => {
              if (disabled) return
              onToggle(item, 'auto_restock')
            }}
          >
            <Upload className="w-4 h-4" />
          </IconToggle>
        )
      },
    },
    {
      key: 'sendCode',
      header: '指令码',
      sortable: true,
      align: 'center',
      render: (item) => (
        <SendCodeEditor
          gid={item.gid}
          sendCode={item.sendCode}
          variant="cell"
          onUpdateField={(gid, _field, value) =>
            updateMutation.mutate({ gid, data: { sendCode: value } })
          }
        />
      ),
    },
  ]

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
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(item) => item.gid}
              gridTemplateColumns={ITEMS_GRID_COLS}
              stickyHeader
              orderBy={orderBy}
              asc={asc}
              onSortChange={handleSortChange}
            />
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
                onShelve={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "shelves" })}
                onOffline={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "offline" })}
                shelfPending={isShelfPending(item)}
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
