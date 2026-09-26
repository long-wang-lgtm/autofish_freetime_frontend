'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import type { OrderStatusTab, PendingOrder, ShipByVoucher } from '@/lib/api/items'
import { ORDER_SORTABLE_FIELDS, fetchOrders, getVoucherKinds, updateItemShipConfig } from '@/lib/api/items'
import { hasShipConfig } from '@/components/items/config'
import { fmtPrice, fmtDate } from '@/lib/utils/format'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { Pagination } from '@/components/ui/data/Pagination'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { ShipConfigModal } from '@/components/items/parts/ShipConfigModal'
import { useAccounts } from '@/hooks/useAccounts'
import { useIsMobile } from '@/hooks/useIsMobile'

/** 发货配置状态徽章配置（已配置=绿 / 未配置=红） */
const SHIP_STATUS_CONFIG: Record<'configured' | 'unconfigured', { label: string; color: 'green' | 'red' }> = {
  configured: { label: '已配置', color: 'green' },
  unconfigured: { label: '未配置', color: 'red' },
}

/**
 * 桌面表格列宽（两套形态，按当前 Tab 是否「待处理」切换）。
 *
 * - 待处理档（待付款/待发货）9 列：订单号/商品ID/商品/买家/规格×数量/金额/时刻/发货配置/操作
 * - 归档档（已发货/退款中/交易成功/交易关闭）7 列：订单已流转完，发货配置与「去配置」
 *   无从谈起，整列去掉，省下的宽度匀给商品与买家列。
 *
 * 两套各自成比例即可，不要求总和相等；调列宽时整套一起调。
 */
const ACTIONABLE_GRID_COLS = '1fr 1fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr'
const ARCHIVED_GRID_COLS = '1fr 1fr 2fr 1fr 1fr 1fr 1fr'

const PAGE_SIZE = 20

/** 视图入参：tab = 当前订单状态档位（state/文案/时刻字段/是否待处理，见 ORDER_STATUS_TABS） */
interface PendingOrdersViewProps {
  tab: OrderStatusTab
}

/** 规格文本：sku 非空时 values 拼接（name:value 逗号分隔）+ ×数量；否则仅 ×数量 */
function buildSkuText(order: PendingOrder): string {
  const buyNum = order.buyNum
  if (order.sku && order.sku.length > 0) {
    const spec = order.sku
      .map((s) => s.values.map((v) => `${v.name}:${v.value}`).join(','))
      .join(',')
    return `${spec}×${buyNum}`
  }
  return `×${buyNum}`
}

/** 移动端卡片视图 */
function PendingOrderCard({
  order,
  tab,
  onConfig,
}: {
  order: PendingOrder
  tab: OrderStatusTab
  onConfig: (order: PendingOrder) => void
}) {
  const configured = hasShipConfig(order.item.config?.shipment)
  const time = order[tab.timeField]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 标题行 */}
      <div className="px-4 pt-3 pb-2">
        <div className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{order.item.title || '无标题'}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
          <span className="truncate max-w-[80px]">{order.account.name}</span>
          <span className="text-gray-300">|</span>
          <span className="tabular-nums truncate">{order.orderId}</span>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* 信息区 */}
      <div className="px-4 py-2 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">商品ID</span>
          <span className="text-gray-700 tabular-nums truncate">{order.item.gid}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">买家</span>
          <span className="text-gray-700 truncate">{order.buyername ?? '-'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">规格×数量</span>
          <span className="text-gray-700 tabular-nums truncate">{buildSkuText(order)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">金额</span>
          <span className="text-gray-900 font-medium tabular-nums">{fmtPrice(order.totalPrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">{tab.timeLabel}</span>
          <span className="text-gray-700 tabular-nums">{time ? fmtDate(time) : '-'}</span>
        </div>
      </div>

      {/* 操作区 —— 仅待处理档（待付款/待发货）需要发货配置 */}
      {tab.actionable && (
        <div className="px-4 pb-3 pt-2 flex items-center justify-between gap-2">
          <StatusBadge
            status={configured ? 'configured' : 'unconfigured'}
            config={SHIP_STATUS_CONFIG}
          />
          <button
            onClick={() => onConfig(order)}
            className="h-11 px-4 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm"
          >
            去配置
          </button>
        </div>
      )}
    </div>
  )
}

export function PendingOrdersView({ tab }: PendingOrdersViewProps) {
  const { state, label: stateLabel, timeLabel, timeField, actionable } = tab
  const timeSortable = (ORDER_SORTABLE_FIELDS as readonly string[]).includes(timeField)
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const { accounts } = useAccounts()

  // 筛选 / 排序 / 分页状态
  const [uid, setUid] = useState<string | undefined>(undefined)
  // 默认按本档「时刻」字段倒序；该字段不在后端白名单时退回后端默认的 payment_at
  const [orderBy, setOrderBy] = useState<string | null>(timeSortable ? timeField : 'payment_at')
  const [asc, setAsc] = useState(false)
  const [page, setPage] = useState(1)

  // 发货配置弹窗
  const [configOrder, setConfigOrder] = useState<PendingOrder | null>(null)

  // 订单列表（按当前 Tab 的订单状态筛选）—— 同步按钮也复用这份缓存键写入
  const ordersQueryKey = ['orders', state, uid, page, PAGE_SIZE, orderBy, asc] as const
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ordersQueryKey,
    queryFn: () => fetchOrders({ state, uid, order_by: orderBy ?? undefined, asc }, page, PAGE_SIZE),
  })

  // 卡种列表
  const { data: voucherKinds = [] } = useQuery({
    queryKey: ['voucherKinds'],
    queryFn: getVoucherKinds,
    staleTime: 5 * 60 * 1000,
  })

  /**
   * 同步：以 sync=true 拉一次 —— 后端会先向闲鱼同步订单再返回列表，所以这一次
   * 请求本身就带回最新数据，直接写进当前页缓存，不必再多发一次查询。
   */
  const syncMutation = useMutation({
    mutationFn: () =>
      fetchOrders({ state, uid, sync: true, order_by: orderBy ?? undefined, asc }, page, PAGE_SIZE),
    onSuccess: (fresh) => {
      queryClient.setQueryData(ordersQueryKey, fresh)
      queryClient.invalidateQueries({ queryKey: ['pendingOrderCount'] })
      toast.success('订单已同步')
    },
    onError: () => {
      toast.error('订单同步失败')
    },
  })

  // 保存发货配置
  const shipConfigMutation = useMutation({
    mutationFn: (args: { gid: number; byEntirety: boolean; voucher: ShipByVoucher }) =>
      updateItemShipConfig(args.gid, {
        stage: 'shipment',
        byEntirety: args.byEntirety,
        voucher: args.voucher,
      }),
    onSuccess: () => {
      toast.success('发货配置已保存')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['pendingOrderCount'] })
    },
    onError: () => {
      toast.error('保存发货配置失败')
    },
  })

  const handleSaveConfig = async (voucher: ShipByVoucher, byEntirety: boolean) => {
    if (!configOrder) return
    try {
      await shipConfigMutation.mutateAsync({
        gid: configOrder.item.gid,
        byEntirety,
        voucher,
      })
    } catch {
      // 错误已由 mutation onError toast 提示
    }
  }

  // 表头排序切换（新列→倒序，同列 desc→asc→清除）
  const handleSortChange = (field: string | null) => {
    setPage(1)
    if (field === null) {
      setOrderBy(null)
      setAsc(false)
      return
    }
    if (orderBy === field) {
      if (asc === false) {
        setAsc(true)
      } else {
        setOrderBy(null)
        setAsc(false)
      }
      return
    }
    setOrderBy(field)
    setAsc(false)
  }

  // 表格列定义
  const columns: DataTableColumn<PendingOrder>[] = [
    {
      key: 'orderId',
      header: '订单号',
      className: 'min-w-0',
      render: (o) => (
        <span className="block w-full text-xs text-gray-700 tabular-nums truncate" title={o.orderId}>
          {o.orderId}
        </span>
      ),
    },
    {
      key: 'itemGid',
      header: '商品ID',
      className: 'min-w-0',
      render: (o) => (
        <span className="block w-full text-xs text-gray-700 tabular-nums truncate" title={String(o.item.gid)}>
          {o.item.gid}
        </span>
      ),
    },
    {
      key: 'item',
      header: '商品',
      className: 'min-w-0',
      render: (o) => (
        <div className="min-w-0">
          <span className="block w-full text-xs text-gray-800 leading-snug truncate" title={o.item.title}>
            {o.item.title || '无标题'}
          </span>
          <span className="block w-full text-[10px] text-gray-400 truncate" title={o.account.name}>
            {o.account.name}
          </span>
        </div>
      ),
    },
    {
      key: 'buyername',
      header: '买家',
      className: 'min-w-0',
      render: (o) => (
        <span className="block w-full text-xs text-gray-700 truncate" title={o.buyername ?? ''}>
          {o.buyername ?? '-'}
        </span>
      ),
    },
    {
      key: 'buyNum',
      header: '规格×数量',
      sortable: true,
      align: 'center',
      render: (o) => <span className="text-xs text-gray-700 tabular-nums">{buildSkuText(o)}</span>,
    },
    {
      key: 'totalPrice',
      header: '金额',
      sortable: true,
      align: 'center',
      render: (o) => (
        <span className="text-xs text-gray-900 font-medium tabular-nums">{fmtPrice(o.totalPrice)}</span>
      ),
    },
    {
      key: timeField,
      header: timeLabel,
      sortable: timeSortable,
      align: 'center',
      render: (o) => {
        const t = o[timeField]
        return <span className="text-xs text-gray-500 tabular-nums">{t ? fmtDate(t) : '-'}</span>
      },
    },
    // 发货配置 / 操作仅「待处理」档（待付款、待发货）需要；其余状态下订单已流转完，无从下手
    ...(actionable
      ? ([
          {
            key: 'shipConfig',
            header: '发货配置',
            align: 'center',
            render: (o: PendingOrder) => (
              <StatusBadge
                status={hasShipConfig(o.item.config?.shipment) ? 'configured' : 'unconfigured'}
                config={SHIP_STATUS_CONFIG}
              />
            ),
          },
          {
            key: 'actions',
            header: '操作',
            align: 'center',
            render: (o: PendingOrder) => (
              <button
                onClick={() => setConfigOrder(o)}
                className="h-7 px-2.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                去配置
              </button>
            ),
          },
        ] as DataTableColumn<PendingOrder>[])
      : []),
  ]

  const total = data?.total ?? 0

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* 筛选行：账号下拉（一框一字段）+ 同步 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-2">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={uid ?? ''}
            onChange={(e) => {
              setUid(e.target.value || undefined)
              setPage(1)
            }}
            className="h-8 px-2 py-0 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部账号</option>
            {accounts.map((acc) => (
              <option key={acc.uid} value={acc.uid}>
                {acc.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            title="从闲鱼同步最新订单"
            className="h-8 px-2 py-0 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? '同步中' : '同步'}
          </button>
        </div>
      </div>

      {/* 内容卡片 */}
      <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {!!error && !isLoading && (
          <ErrorBanner
            message={`加载${stateLabel}订单失败: ${String(error)}`}
            variant="banner"
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && data && data.items.length === 0 && (
          <EmptyState title={`暂无${stateLabel}订单`} description={`当前没有${stateLabel}的订单`} />
        )}

        {!isLoading && !error && data && data.items.length > 0 && (
          <>
            {/* 桌面表格 */}
            <div className="flex-1 overflow-auto hidden md:block min-h-[200px]">
              <DataTable
                columns={columns}
                data={data.items}
                keyExtractor={(o) => o.orderId}
                gridTemplateColumns={actionable ? ACTIONABLE_GRID_COLS : ARCHIVED_GRID_COLS}
                stickyHeader
                orderBy={orderBy}
                asc={asc}
                onSortChange={handleSortChange}
              />
            </div>

            {/* 移动端卡片降级 */}
            <div className="flex-1 overflow-auto md:hidden pb-3 space-y-2 min-h-[200px]">
              {data.items.map((order) => (
                <PendingOrderCard
                  key={order.orderId}
                  order={order}
                  tab={tab}
                  onConfig={setConfigOrder}
                />
              ))}
            </div>
          </>
        )}

        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* 发货配置弹窗（stage='shipment'，直接喂完整商品对象） */}
      {configOrder && (
        <ShipConfigModal
          open
          onClose={() => setConfigOrder(null)}
          stage="shipment"
          gid={configOrder.item.gid}
          title={configOrder.item.title}
          isMobile={isMobile}
          skus={configOrder.item.skus}
          config={configOrder.item.config?.shipment ?? null}
          voucherKinds={voucherKinds}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  )
}
