"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Bot, Truck, Upload } from "lucide-react"
import type { ShopItem, ShipByVoucher } from "@/lib/api/items"
import { getVoucherKinds } from "@/lib/api/items"
import type { ShipStage } from "@/components/items/config"
import { hasShipConfig, formatPublishTime } from "@/components/items/config"
import { ITEMS_GRID_COLS } from "@/components/items/views/ItemRow"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { ItemEditDrawer } from "@/components/items/drawers/ItemEditDrawer"
import { KeywordDrawer } from "@/components/items/drawers/RulesItemsingleDrawer"
import { IconToggle } from "@/components/items/parts/IconToggle"
import { SendCodeEditor } from "@/components/items/parts/SendCodeEditor"
import { ShelfActions } from "@/components/items/parts/ShelfActions"
import { ConfigStatusCell } from "@/components/items/parts/ConfigStatusCell"
import { ShipConfigModal } from "@/components/items/parts/ShipConfigModal"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'

interface ItemsTabProps {
  isMobile: boolean
  data: ShopItem[] | undefined
  isLoading: boolean
  error: unknown
  itemKeywordCounts: Record<string, number>
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onRetry: () => void
  onToggle: (item: ShopItem, field: string) => void
  updateMutation: { mutate: (args: { gid: number; data: Record<string, unknown> }) => void }
  shelfMutation: {
    mutate: (args: { gid: number; uid: string; action: "shelves" | "offline" }) => void
    isPending: boolean
    variables?: { gid: number; uid: string; action: "shelves" | "offline" }
  }
  shipConfigMutation: {
    mutateAsync: (args: {
      gid: number
      stage: 'shipment' | 'shipconfirm' | 'evaluation'
      byEntirety: boolean
      voucher: ShipByVoucher
    }) => Promise<unknown>
    isPending: boolean
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
  shipConfigMutation,
  orderBy,
  asc,
  onSortChange,
}: ItemsTabProps) {
  // 弹窗状态
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null)
  const [keywordItem, setKeywordItem] = useState<ShopItem | null>(null)

  // ShipConfigModal 状态（统一处理单规格和多规格）
  const [configStage, setConfigStage] = useState<ShipStage | null>(null)
  const [configItem, setConfigItem] = useState<ShopItem | null>(null)

  // 卡种列表
  const { data: voucherKinds = [] } = useQuery({
    queryKey: ["voucherKinds"],
    queryFn: getVoucherKinds,
    staleTime: 5 * 60 * 1000,
  })

  const isShelfPending = (item: ShopItem) =>
    shelfMutation.isPending && shelfMutation.variables?.gid === item.gid

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [page])

  const handleSortChange = (field: string | null) => {
    if (field === null) {
      if (orderBy) onSortChange(orderBy)
    } else {
      onSortChange(field)
    }
  }

  // 点击配置列 → 直接打开 ShipConfigModal
  const handleConfigClick = (item: ShopItem, stage: ShipStage) => {
    setConfigStage(stage)
    setConfigItem(item)
  }

  // ShipConfigModal → 保存回调
  const handleSaveConfig = async (voucher: ShipByVoucher, byEntirety: boolean) => {
    if (!configItem || !configStage) return
    await shipConfigMutation.mutateAsync({
      gid: configItem.gid, stage: configStage, byEntirety, voucher,
    })
  }

  // 构建表格列定义
  const columns: DataTableColumn<ShopItem>[] = [
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
            <span title={item.account.uid} className="truncate">{item.account.name}</span>
            <span className="text-gray-300">|</span>
            <span title={String(item.gid)} className="min-w-[85px] truncate">{item.gid}</span>
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
        <span className="text-orange-600 font-semibold text-xs">{item.reservePrice || '-'}</span>
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
      key: 'auto_ship',
      header: '自动发货',
      align: 'center',
      render: (item) => (
        <IconToggle
          active={item.auto_ship}
          activeClass="text-green-500 bg-green-50"
          title={item.auto_ship ? '自动发货：开' : '自动发货：关'}
          onClick={() => onToggle(item, 'auto_ship')}
        >
          <Truck className="w-4 h-4" />
        </IconToggle>
      ),
    },
    {
      key: 'shipment',
      header: '付款后发货',
      align: 'center',
      render: (item) => (
        <ConfigStatusCell
          hasConfig={item.config ? hasShipConfig(item.config.shipment) : false}
          onClick={() => handleConfigClick(item, 'shipment')}
        />
      ),
    },
    {
      key: 'shipconfirm',
      header: '收货后赠送',
      align: 'center',
      render: (item) => (
        <ConfigStatusCell
          hasConfig={item.config ? hasShipConfig(item.config.shipconfirm) : false}
          onClick={() => handleConfigClick(item, 'shipconfirm')}
        />
      ),
    },
    {
      key: 'evaluation',
      header: '评价后赠送',
      align: 'center',
      render: (item) => (
        <ConfigStatusCell
          hasConfig={item.config ? hasShipConfig(item.config.evaluation) : false}
          onClick={() => handleConfigClick(item, 'evaluation')}
        />
      ),
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
              count > 0 ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-gray-600'
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
        const value = item.config?.ai_prompt || ''
        const hasValue = value.trim().length > 0
        return (
          <button
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
        const disabled = item.account.isPro
        return (
          <IconToggle
            active={item.auto_restock}
            activeClass="text-teal-500 bg-teal-50"
            disabled={disabled}
            title={disabled ? 'Pro 账号不支持自动上架' : item.auto_restock ? '自动上架：开' : '自动上架：关'}
            onClick={() => { if (!disabled) onToggle(item, 'auto_restock') }}
          >
            <Upload className="w-4 h-4" />
          </IconToggle>
        )
      },
    },
    {
      key: 'sendCode',
      header: '指令码',
      align: 'center',
      render: (item) => (
        <SendCodeEditor
          gid={item.gid}
          sendCode={item.config?.sendCode ?? null}
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
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!!error && !isLoading && (
        <ErrorBanner
          message={`加载商品列表失败: ${String(error)}`}
          variant="banner"
          onRetry={onRetry}
        />
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <EmptyState title="暂无商品" description="没有找到符合条件的商品" />
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <>
          <div ref={listRef} className="flex-1 overflow-auto hidden md:block min-h-[200px]">
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(item) => String(item.gid)}
              gridTemplateColumns={ITEMS_GRID_COLS}
              stickyHeader
              orderBy={orderBy}
              asc={asc}
              onSortChange={handleSortChange}
            />
          </div>

          <div className="flex-1 overflow-auto md:hidden pb-3 space-y-2 min-h-[200px]">
            {data.map((item) => (
              <MobileProductCard
                key={item.gid}
                item={item}
                keywordCount={itemKeywordCounts[item.gid] || 0}
                onToggle={onToggle}
                onEdit={() => setEditingItem(item)}
                onKeywordClick={() => setKeywordItem(item)}
                onConfigClick={(stage) => handleConfigClick(item, stage as ShipStage)}
                onSendCodeChange={(gid, value) => updateMutation.mutate({ gid, data: { sendCode: value } })}
                onShelve={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "shelves" })}
                onOffline={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "offline" })}
                shelfPending={isShelfPending(item)}
              />
            ))}
          </div>
        </>
      )}

      <Pagination page={page} total={totalItems} pageSize={pageSize} onChange={onPageChange} />

      {/* 发货配置弹窗（单规格 + 多规格统一） */}
      {configStage && configItem && (
        <ShipConfigModal
          open
          onClose={() => { setConfigStage(null); setConfigItem(null) }}
          stage={configStage}
          gid={configItem.gid}
          title={configItem.title}
          isMobile={isMobile}
          skus={configItem.skus}
          config={configItem.config?.[configStage] ?? null}
          voucherKinds={voucherKinds}
          onSave={handleSaveConfig}
        />
      )}

      {/* 编辑商品（后续适配） */}
      {editingItem && (
        <ItemEditDrawer
          item={editingItem}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => setEditingItem(null)}
        />
      )}

      {/* 关键词回复（后续适配） */}
      {keywordItem && (
        <KeywordDrawer
          item={keywordItem as any}
          open={!!keywordItem}
          onClose={() => setKeywordItem(null)}
        />
      )}
    </div>
  )
}
