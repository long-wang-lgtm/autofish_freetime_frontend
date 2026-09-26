'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { OrderStatusTab, OrdersQuery, PendingOrder, ShipByVoucher } from '@/lib/api/items'
import { ORDER_SORTABLE_FIELDS, fetchOrders, getVoucherKinds, updateItemShipConfig } from '@/lib/api/items'
import { hasShipConfig } from '@/components/items/config'
import { fmtPrice, fmtDateTimeRaw } from '@/lib/utils/format'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { Pagination } from '@/components/ui/data/Pagination'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { OrdersFilterBar } from '@/components/orders/OrdersFilterBar'
import { ShipConfigModal } from '@/components/items/parts/ShipConfigModal'
import { useAccounts } from '@/hooks/useAccounts'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useOrdersFilters } from '@/hooks/useOrdersFilters'

/** 发货配置状态徽章配置（已配置=绿 / 未配置=红） */
const SHIP_STATUS_CONFIG: Record<'configured' | 'unconfigured', { label: string; color: 'green' | 'red' }> = {
  configured: { label: '已配置', color: 'green' },
  unconfigured: { label: '未配置', color: 'red' },
}

/**
 * 订单状态徽章配置（「全部订单」档的状态列用）。
 *
 * StatusBadge 只有 green/red/amber/gray 四色，故按语义归类：待办类（待付款、待发货）
 * 共用 amber，已终止的（交易关闭、已发货）共用 gray，退款中是异常态用 red。
 */
const ORDER_STATUS_BADGE_CONFIG: Record<string, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
  '待付款':   { label: '待付款',   color: 'amber' },
  '待发货':   { label: '待发货',   color: 'amber' },
  '已发货':   { label: '已发货',   color: 'gray' },
  '退款中':   { label: '退款中',   color: 'red' },
  '交易成功': { label: '交易成功', color: 'green' },
  '交易关闭': { label: '交易关闭', color: 'gray' },
}

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 标题行 */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
            {order.item.title || '无标题'}
          </div>
          {/* 状态徽章仅跨状态档位（全部订单）显示 */}
          {tab.withState && (
            <StatusBadge status={order.orderStatus} config={ORDER_STATUS_BADGE_CONFIG} />
          )}
        </div>
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
        {/* 时间行按档位配置展开（待发货 1 行、已发货 2 行、交易成功 3 行） */}
        {tab.times.map(({ label, field }) => (
          <div key={field} className="flex items-center justify-between">
            <span className="text-gray-400">{label}</span>
            <span className="text-gray-700 tabular-nums whitespace-nowrap">
              {order[field] ? fmtDateTimeRaw(order[field]) : '-'}
            </span>
          </div>
        ))}
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
  const { state, emptyText, times, actionable, withState } = tab
  // 默认按本档最后一个时间列（最靠后的环节）倒序；该字段不在后端白名单时退回 payment_at
  const leadTimeField = times[times.length - 1].field
  const leadSortable = (ORDER_SORTABLE_FIELDS as readonly string[]).includes(leadTimeField)
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const { accounts } = useAccounts()

  // 筛选（输入值在 filters，防抖后落在 query）/ 排序 / 分页
  const { filters, query, setFilter, clearFilters, activeCount } = useOrdersFilters()
  const [orderBy, setOrderBy] = useState<string | null>(leadSortable ? leadTimeField : 'payment_at')
  const [asc, setAsc] = useState(false)
  const [page, setPage] = useState(1)

  // 发货配置弹窗
  const [configOrder, setConfigOrder] = useState<PendingOrder | null>(null)

  /** 请求条件（筛选 + 排序），一框一字段；空串一律不发给后端 */
  const ordersQuery = useMemo<OrdersQuery>(
    () => ({
      state,
      uid: query.uid,
      orderId: query.orderId || undefined,
      gid: query.gid || undefined,
      title: query.title || undefined,
      buyerId: query.buyerId || undefined,
      buyerName: query.buyerName || undefined,
      order_by: orderBy ?? undefined,
      asc,
    }),
    [state, query, orderBy, asc],
  )

  // 筛选条件变化 → 回到第一页（否则会停在旧结果的第 N 页）
  useEffect(() => {
    setPage(1)
  }, [query])

  // 订单列表（按当前 Tab 的订单状态筛选）—— 同步按钮也复用这份缓存键写入
  const ordersQueryKey = useMemo(
    () => ['orders', ordersQuery, page, PAGE_SIZE] as const,
    [ordersQuery, page],
  )
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ordersQueryKey,
    queryFn: () => fetchOrders(ordersQuery, page, PAGE_SIZE),
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
    mutationFn: () => fetchOrders({ ...ordersQuery, sync: true }, page, PAGE_SIZE),
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
    // 订单状态列仅跨状态档位（全部订单）挂载 —— 单状态档位整列都是同一个值，摆着就是冗余
    ...(withState
      ? ([
          {
            key: 'orderStatus',
            header: '状态',
            align: 'center',
            render: (o: PendingOrder) => (
              <StatusBadge status={o.orderStatus} config={ORDER_STATUS_BADGE_CONFIG} />
            ),
          },
        ] as DataTableColumn<PendingOrder>[])
      : []),
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
    // 时间列按档位配置展开（待发货 1 列、已发货 2 列、交易成功 3 列）
    ...times.map(({ label, field }) => ({
      key: field,
      header: label,
      sortable: (ORDER_SORTABLE_FIELDS as readonly string[]).includes(field),
      align: 'center' as const,
      render: (o: PendingOrder) => {
        const t = o[field]
        return <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">{t ? fmtDateTimeRaw(t) : '-'}</span>
      },
    })),
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

  /** 列宽：商品列占 2 份（标题最长），其余一律等宽 1 份 */
  const gridCols = columns.map((c) => (c.key === 'item' ? '2fr' : '1fr')).join(' ')

  const total = data?.total ?? 0

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* 筛选栏：账号 + 商品标题/商品ID/订单号/买家昵称/买家ID（一框一字段）+ 清空 + 同步 */}
      <OrdersFilterBar
        accounts={accounts}
        filters={filters}
        onFilterChange={setFilter}
        activeCount={activeCount}
        onClear={clearFilters}
        onSync={() => syncMutation.mutate()}
        isSyncing={syncMutation.isPending}
      />

      {/* 内容卡片 */}
      <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {!!error && !isLoading && (
          <ErrorBanner
            message={`加载${emptyText}失败: ${String(error)}`}
            variant="banner"
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && data && data.items.length === 0 && (
          activeCount > 0 ? (
            <EmptyState
              title={`没有符合筛选的${emptyText}`}
              description="换个条件试试，或清空筛选看本档全部订单"
              action={{ label: '清空筛选', onClick: clearFilters }}
            />
          ) : (
            <EmptyState title={`暂无${emptyText}`} description={`当前没有${emptyText}`} />
          )
        )}

        {!isLoading && !error && data && data.items.length > 0 && (
          <>
            {/* 桌面表格 */}
            <div className="flex-1 overflow-auto hidden md:block min-h-[200px]">
              <DataTable
                columns={columns}
                data={data.items}
                keyExtractor={(o) => o.orderId}
                gridTemplateColumns={gridCols}
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
