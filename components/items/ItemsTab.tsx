"use client"

import { Fragment, useState, useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ShopItem, ShopItemConfigUpdate, ShipByVoucher, FansPriceUpdate, ItemEditMaterial } from "@/lib/api/items"
import { getVoucherKinds } from "@/lib/api/items"
import type { ShipStage } from "@/components/items/config"
import {
  hasShipConfig, formatPublishTime, statusLabel, displayQuantity, fansPrices, FANS_GROUPS,
  canSetFansPrice,
} from "@/components/items/config"
import { AutomationToggles } from "@/components/items/parts/AutomationToggles"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { ItemEditModal } from "@/components/items/drawers/ItemEditModal"
import { KeywordDrawer } from "@/components/items/drawers/RulesItemsingleDrawer"
import { SendCodeEditor } from "@/components/items/parts/SendCodeEditor"
import { ShelfActions } from "@/components/items/parts/ShelfActions"
import { DeleteItemButton } from "@/components/items/parts/DeleteItemButton"
import { RepublishButton } from "@/components/items/parts/RepublishButton"
import { ItemActionButtons } from "@/components/items/parts/ItemActionButtons"
import type { RepriceSubmit } from "@/components/items/parts/RepricingDialog"
import type { FansPriceSubmit } from "@/components/items/parts/FansPriceDialog"
import { ConfigStatusCell } from "@/components/items/parts/ConfigStatusCell"
import { ShipConfigModal } from "@/components/items/parts/ShipConfigModal"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'

/**
此处等宽设置，严禁修改，仅允许增加或减少列数
 */
const ITEMS_GRID_COLS = '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'

/** 「发货/赠送」列内的三个子阶段（顺序：付款后发货 → 收货后赠送 → 评价后赠送） */
const DELIVERY_STAGES: { stage: ShipStage; label: string }[] = [
  { stage: 'shipment', label: '付款后发货' },
  { stage: 'shipconfirm', label: '收货后赠送' },
  { stage: 'evaluation', label: '评价后赠送' },
]

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
  configMutation: { mutate: (args: { gid: number; data: ShopItemConfigUpdate }) => void }
  shelfMutation: {
    mutate: (args: { gid: number; uid: string; action: "shelves" | "offline" }) => void
    isPending: boolean
    variables?: { gid: number; uid: string; action: "shelves" | "offline" }
  }
  deleteMutation: {
    mutate: (args: { gid: number; uid: string }) => void
    isPending: boolean
    variables?: { gid: number; uid: string }
  }
  editItemMutation: {
    mutateAsync: (args: {
      gid: number; uid: string; material: ItemEditMaterial
    }) => Promise<unknown>
    isPending: boolean
  }
  republishMutation: {
    mutateAsync: (args: {
      gid: number; uid: string; material: ItemEditMaterial
    }) => Promise<unknown>
    isPending: boolean
    variables?: { gid: number; uid: string }
  }
  repriceMutation: {
    mutateAsync: (args: {
      gid: number; uid: string; isPro: boolean; price: number; quantity?: number
    }) => Promise<unknown>
  }
  fansPriceMutation: {
    mutateAsync: (args: { gid: number; uid: string } & FansPriceUpdate) => Promise<unknown>
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
  configMutation,
  shelfMutation,
  deleteMutation,
  editItemMutation,
  republishMutation,
  repriceMutation,
  fansPriceMutation,
  shipConfigMutation,
  orderBy,
  asc,
  onSortChange,
}: ItemsTabProps) {
  // 弹窗状态
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null)
  // 重发走的是同一个编辑弹窗，只是提交动作不同 —— 所以单独记「要重发哪一个」
  const [republishTarget, setRepublishTarget] = useState<ShopItem | null>(null)
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

  const isDeletePending = (item: ShopItem) =>
    deleteMutation.isPending && deleteMutation.variables?.gid === item.gid

  const handleDelete = (item: ShopItem) =>
    deleteMutation.mutate({ gid: item.gid, uid: item.account.uid })

  // 重发先开弹窗（同一套商品表单），确认与提交都在弹窗里完成
  const handleRepublish = (item: ShopItem) => setRepublishTarget(item)

  // 改价：接口分流交给 mutation，这里只把账号类型一并带下去。
  // 返回 Promise 供 RepricingDialog 决定是否关闭弹窗（成功才关）
  const handleReprice = async (item: ShopItem, submit: RepriceSubmit): Promise<void> => {
    await repriceMutation.mutateAsync({
      gid: item.gid, uid: item.account.uid, isPro: item.account.isPro, ...submit,
    })
  }

  // 粉丝价：三档一次提交，同样返回 Promise 供弹窗决定关闭时机
  const handleSetFansPrice = async (item: ShopItem, submit: FansPriceSubmit): Promise<void> => {
    await fansPriceMutation.mutateAsync({
      gid: item.gid, uid: item.account.uid, ...submit,
    })
  }

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
      render: (item) => {
        const status = statusLabel(item.status)
        return (
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
              <span className={`px-1.5 py-px rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
                {status.text}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      key: 'price',
      header: '价格/库存/粉丝价',
      sortable: true,
      align: 'center',
      render: (item) => {
        const quantity = displayQuantity(item)
        // 三档固定顺序：全部粉丝价 | 老粉价 | 已购粉价，未设置的档位显示 -
        // 未设置的档位是"没有"，用 gray-400（占位档）而非数值色，避免把 - 读成有效数据
        const prices = fansPrices(item)
        return (
          <div className="flex flex-col items-center gap-0.5 text-xs leading-tight">
            {/* 第一行：现价 | 库存 */}
            <span className="inline-flex items-center gap-1">
              <span className="text-orange-600 font-semibold">{item.reservePrice || '-'}</span>
              <span className="text-gray-300">|</span>
              {/* 库存是有值的数字，不能用 gray-400（那是禁用/占位档），按数值列规范上 tabular-nums */}
              <span className="text-gray-800 tabular-nums">{quantity === null ? '-' : quantity}</span>
            </span>
            {/* 第二行：粉丝价三档，与上一行同为「价格」语义，故沿用同一套数值/占位配色。
                多规格商品不支持设置粉丝价（后端 403），整行不渲染 —— 显示成 -/-/- 会让人
                以为是"还没设置"，而实际是"没有这个概念" */}
            {canSetFansPrice(item) && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                {prices.map((price, i) => (
                  <Fragment key={FANS_GROUPS[i].key}>
                    {i > 0 && <span className="text-gray-300">|</span>}
                    <span className={price === null ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}>
                      {price === null ? '-' : price}
                    </span>
                  </Fragment>
                ))}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'automation',
      header: '自动化',
      align: 'center',
      render: (item) => (
        <AutomationToggles item={item} onToggle={onToggle} />
      ),
    },
    {
      key: 'itemActions',
      header: '编辑/改价/粉丝价',
      align: 'center',
      render: (item) => (
        <ItemActionButtons
          item={item}
          onEdit={() => setEditingItem(item)}
          onReprice={handleReprice}
          onSetFansPrice={handleSetFansPrice}
        />
      ),
    },
    {
      key: 'actions',
      header: '上架/下架/删除/重发',
      align: 'center',
      render: (item) => (
        <div className="inline-flex items-center justify-center gap-1">
          <ShelfActions
            item={item}
            variant="desktop"
            pending={isShelfPending(item)}
            onShelve={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "shelves" })}
            onOffline={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "offline" })}
          />
          <DeleteItemButton
            item={item}
            variant="desktop"
            pending={isDeletePending(item)}
            onDelete={handleDelete}
          />
          <RepublishButton
            item={item}
            variant="desktop"
            onRepublish={handleRepublish}
          />
        </div>
      ),
    },
    {
      key: 'delivery',
      header: '发货/赠送',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          {DELIVERY_STAGES.map(({ stage, label }, i) => (
            <Fragment key={stage}>
              {i > 0 && <span className="text-gray-300">/</span>}
              <ConfigStatusCell
                label={label}
                hasConfig={item.config ? hasShipConfig(item.config[stage]) : false}
                onClick={() => handleConfigClick(item, stage)}
              />
            </Fragment>
          ))}
        </div>
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
      key: 'publishTime',
      header: '发布时间',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-xs text-gray-500">{formatPublishTime(item.publishTime)}</span>
      ),
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
            configMutation.mutate({ gid, data: { sendCode: value } })
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
                onSendCodeChange={(gid, value) => configMutation.mutate({ gid, data: { sendCode: value } })}
                onShelve={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "shelves" })}
                onOffline={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "offline" })}
                onDelete={handleDelete}
                onRepublish={handleRepublish}
                onReprice={handleReprice}
                onSetFansPrice={handleSetFansPrice}
                shelfPending={isShelfPending(item)}
                deletePending={isDeletePending(item)}
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

      {/* 编辑商品属性（封面图/描述/价格/发布地址） */}
      {editingItem && (
        <ItemEditModal
          item={editingItem}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          submit={{
            label: "保存",
            run: (material) =>
              editItemMutation.mutateAsync({
                gid: editingItem.gid,
                uid: editingItem.account.uid,
                material,
              }),
            pending: editItemMutation.isPending,
          }}
        />
      )}

      {/* 重新发布 —— 同一个弹窗、同一套表单，只是提交动作换成重发接口。
          弹窗里的改动同样作为请求体下发 */}
      {republishTarget && (
        <ItemEditModal
          item={republishTarget}
          open={!!republishTarget}
          onClose={() => setRepublishTarget(null)}
          submit={{
            label: "重发",
            run: (material) =>
              republishMutation.mutateAsync({
                gid: republishTarget.gid,
                uid: republishTarget.account.uid,
                material,
              }),
            pending: republishMutation.isPending,
            confirm: {
              title: "确认重新发布吗？",
              description: (
                <>
                  1. 将当前商品删除后重发，当前商品不可恢复 !<br />
                  2. 新商品 ID 与当前商品不同，当前商品的链接将失效<br />
                  3. 列表中的该商品会直接替换为新商品<br />
                </>
              ),
              confirmLabel: "重新发布",
            },
          }}
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
