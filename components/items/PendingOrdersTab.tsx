'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import type { AccountName } from '@/lib/api/accounts'
import type { PendingOrder, ShipByVoucher } from '@/lib/api/items'
import { fetchPendingOrders, getVoucherKinds, updateItemShipConfig } from '@/lib/api/items'
import { hasShipConfig } from './config'
import { fmtPrice, fmtDate } from '@/lib/utils/format'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { Pagination } from '@/components/ui/data/Pagination'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { ShipConfigModal } from '@/components/items/parts/ShipConfigModal'

/** 发货配置状态徽章配置（已配置=绿 / 未配置=红） */
const SHIP_STATUS_CONFIG: Record<'configured' | 'unconfigured', { label: string; color: 'green' | 'red' }> = {
  configured: { label: '已配置', color: 'green' },
  unconfigured: { label: '未配置', color: 'red' },
}

/** 桌面表格列宽 — 订单号/商品ID/商品/买家/规格×数量/金额/下单时间/发货配置/操作 */
const PENDING_ORDERS_GRID_COLS = '8fr 8fr 16fr 8fr 8fr 6fr 8fr 7fr 6fr'

const PAGE_SIZE = 20

interface PendingOrdersTabProps {
  isMobile: boolean
  accounts: AccountName[]
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
  onConfig,
}: {
  order: PendingOrder
  onConfig: (order: PendingOrder) => void
}) {
  const configured = hasShipConfig(order.item.config?.shipment)

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
          <span className="text-gray-400">下单时间</span>
          <span className="text-gray-700 tabular-nums">{fmtDate(order.payment_at ?? order.created_at)}</span>
        </div>
      </div>

      {/* 操作区 */}
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
    </div>
  )
}

export function PendingOrdersTab({ isMobile, accounts }: PendingOrdersTabProps) {
  const queryClient = useQueryClient()

  // 筛选 / 排序 / 分页状态
  const [uid, setUid] = useState<string | undefined>(undefined)
  const [orderBy, setOrderBy] = useState<string | null>('payment_at') // 默认按支付时间倒序（后端默认）
  const [asc, setAsc] = useState(false)
  const [page, setPage] = useState(1)

  // 发货配置弹窗
  const [configOrder, setConfigOrder] = useState<PendingOrder | null>(null)

  // 待发货订单列表
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['pendingOrders', uid, page, PAGE_SIZE, orderBy, asc],
    queryFn: () =>
      fetchPendingOrders({
        uid,
        page,
        size: PAGE_SIZE,
        order_by: orderBy ?? undefined,
        asc,
      }),
  })

  // 卡种列表
  const { data: voucherKinds = [] } = useQuery({
    queryKey: ['voucherKinds'],
    queryFn: getVoucherKinds,
    staleTime: 5 * 60 * 1000,
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
      key: 'payment_at',
      header: '下单时间',
      sortable: true,
      align: 'center',
      render: (o) => (
        <span className="text-xs text-gray-500 tabular-nums">{fmtDate(o.payment_at ?? o.created_at)}</span>
      ),
    },
    {
      key: 'shipConfig',
      header: '发货配置',
      align: 'center',
      render: (o) => (
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
      render: (o) => (
        <button
          onClick={() => setConfigOrder(o)}
          className="h-7 px-2.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          去配置
        </button>
      ),
    },
  ]

  const total = data?.total ?? 0

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* 筛选行：账号下拉（一框一字段）+ 刷新 */}
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
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2 py-0 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            刷新
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
            message={`加载待发货订单失败: ${String(error)}`}
            variant="banner"
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && data && data.items.length === 0 && (
          <EmptyState title="暂无待发货订单" description="当前没有需要处理的待发货订单" />
        )}

        {!isLoading && !error && data && data.items.length > 0 && (
          <>
            {/* 桌面表格 */}
            <div className="flex-1 overflow-auto hidden md:block min-h-[200px]">
              <DataTable
                columns={columns}
                data={data.items}
                keyExtractor={(o) => o.orderId}
                gridTemplateColumns={PENDING_ORDERS_GRID_COLS}
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
