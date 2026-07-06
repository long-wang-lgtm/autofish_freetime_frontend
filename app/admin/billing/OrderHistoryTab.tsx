'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  adminApi,
  type MembershipOrder,
  type StoneOrder,
} from '@/lib/api/admin'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/pagination'
import { fmtPrice, fmtDate, fmtDateTime } from '@/lib/utils/format'
import { Search } from 'lucide-react'

const PAGE_SIZE = 20

type OrderType = 'membership' | 'stone'
type BadgeColor = 'green' | 'red' | 'amber' | 'gray'

// ===== 状态映射 =====

const ORDER_STATUS_BADGE_CONFIG: Record<string, { label: string; color: BadgeColor }> = {
  paid: { label: '已支付', color: 'green' },
  pending: { label: '待支付', color: 'amber' },
  cancelled: { label: '已取消', color: 'gray' },
  expired: { label: '已过期', color: 'gray' },
}

const CHANGE_TYPE_BADGE_CONFIG: Record<string, { label: string; color: BadgeColor }> = {
  activate: { label: '激活', color: 'gray' },
  upgrade: { label: '升级', color: 'gray' },
  downgrade: { label: '降级', color: 'red' },
  renew: { label: '续费', color: 'amber' },
}

function displayTier(tier: number): string {
  const labels: Record<number, string> = { 0: 'Free', 1: 'Basic', 2: 'Standard', 3: 'Pro' }
  return labels[tier] ?? `Lv${tier}`
}

export function OrderHistoryTab() {
  const [orderType, setOrderType] = useState<OrderType>('membership')

  // 筛选条件（两种订单共享）
  const [userIdFilter, setUserIdFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')

  // 会员订单
  const [memberOrders, setMemberOrders] = useState<MembershipOrder[]>([])
  const [memberLoading, setMemberLoading] = useState(true)
  const [memberError, setMemberError] = useState<string | null>(null)
  const [memberPage, setMemberPage] = useState(1)
  const [memberTotal, setMemberTotal] = useState(0)

  // 风铃石订单
  const [stoneOrders, setStoneOrders] = useState<StoneOrder[]>([])
  const [stoneLoading, setStoneLoading] = useState(true)
  const [stoneError, setStoneError] = useState<string | null>(null)
  const [stonePage, setStonePage] = useState(1)
  const [stoneTotal, setStoneTotal] = useState(0)

  // ---- 获取会员订单 ----
  const fetchMemberOrders = useCallback(async (p: number) => {
    setMemberLoading(true)
    setMemberError(null)
    try {
      const data = await adminApi.getMembershipOrders(
        p,
        PAGE_SIZE,
        userIdFilter || undefined,
      )
      const list = data || []
      setMemberOrders(list)
      setMemberTotal(
        list.length === PAGE_SIZE
          ? (p + 1) * PAGE_SIZE
          : (p - 1) * PAGE_SIZE + list.length,
      )
    } catch (e) {
      setMemberError(String(e))
    } finally {
      setMemberLoading(false)
    }
  }, [userIdFilter])

  useEffect(() => {
    if (orderType === 'membership') fetchMemberOrders(memberPage)
  }, [orderType, memberPage, fetchMemberOrders])

  // ---- 获取风铃石订单 ----
  const fetchStoneOrders = useCallback(async (p: number) => {
    setStoneLoading(true)
    setStoneError(null)
    try {
      const data = await adminApi.getStoneOrders(
        p,
        PAGE_SIZE,
        userIdFilter || undefined,
        statusFilter || undefined,
        accountFilter || undefined,
      )
      const list = data || []
      setStoneOrders(list)
      setStoneTotal(
        list.length === PAGE_SIZE
          ? (p + 1) * PAGE_SIZE
          : (p - 1) * PAGE_SIZE + list.length,
      )
    } catch (e) {
      setStoneError(String(e))
    } finally {
      setStoneLoading(false)
    }
  }, [userIdFilter, statusFilter, accountFilter])

  useEffect(() => {
    if (orderType === 'stone') fetchStoneOrders(stonePage)
  }, [orderType, stonePage, fetchStoneOrders])

  // 切换类型时重置页码
  const handleTypeChange = (type: OrderType) => {
    if (type !== orderType) {
      setOrderType(type)
      if (type === 'membership') setMemberPage(1)
      else setStonePage(1)
    }
  }

  // 搜索
  const handleSearch = () => {
    if (orderType === 'membership') {
      setMemberPage(1)
      fetchMemberOrders(1)
    } else {
      setStonePage(1)
      fetchStoneOrders(1)
    }
  }

  // ===== 会员订单列 =====
  const memberColumns: DataTableColumn<MembershipOrder>[] = [
    {
      key: 'order_id',
      header: '订单ID',
      render: (item) => (
        <span
          className="font-mono text-xs text-gray-600 truncate block max-w-[120px]"
          title={item.order_id}
        >
          {item.order_id}
        </span>
      ),
    },
    {
      key: 'user',
      header: '用户',
      render: (item) => (
        <span className="text-gray-700">{item.user?.username ?? '-'}</span>
      ),
    },
    {
      key: 'change_type',
      header: '变更类型',
      render: (item) => (
        <StatusBadge status={item.change_type} config={CHANGE_TYPE_BADGE_CONFIG} />
      ),
    },
    {
      key: 'old_plan',
      header: '旧方案',
      render: (item) => (
        <span className="text-gray-500 text-xs">
          {item.old_plan ? displayTier(item.old_plan.tier) : '-'}
        </span>
      ),
    },
    {
      key: 'new_plan',
      header: '新方案',
      render: (item) => (
        <span className="text-gray-700 text-xs font-medium">
          {item.new_plan ? displayTier(item.new_plan.tier) : '-'}
        </span>
      ),
    },
    {
      key: 'amount_cents',
      header: '金额',
      render: (item) => (
        <span
          className={item.amount_cents === 0 ? 'text-gray-400' : 'text-gray-700'}
        >
          {fmtPrice(item.amount_cents)}
        </span>
      ),
    },
    {
      key: 'amount_months',
      header: '月数',
      render: (item) => (
        <span className="text-gray-600">
          {item.amount_months > 0 ? item.amount_months : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (item) => (
        <StatusBadge status={item.status} config={ORDER_STATUS_BADGE_CONFIG} />
      ),
    },
    {
      key: 'expires',
      header: '到期变更',
      render: (item) => (
        <div className="text-xs leading-tight">
          <div className="text-gray-400">
            {item.old_expires_at ? fmtDate(item.old_expires_at) : '-'}
          </div>
          <div className="text-gray-600">
            → {item.new_expires_at ? fmtDate(item.new_expires_at) : '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'operator',
      header: '操作人',
      render: (item) => {
        const name = item.operator_user?.username
        return (
          <span className="text-gray-500 text-xs">
            {name === 'system' || !name ? '自动' : name}
          </span>
        )
      },
    },
    {
      key: 'time',
      header: '时间',
      render: (item) => (
        <div className="text-xs leading-tight">
          <div className="text-gray-600">{fmtDateTime(item.created_at)}</div>
          {item.paid_at && (
            <div className="text-gray-400">付: {fmtDateTime(item.paid_at)}</div>
          )}
        </div>
      ),
    },
  ]

  // ===== 风铃石订单列 =====
  const stoneColumns: DataTableColumn<StoneOrder>[] = [
    {
      key: 'order_id',
      header: '订单ID',
      render: (item) => (
        <span
          className="font-mono text-xs text-gray-600 truncate block max-w-[120px]"
          title={item.order_id}
        >
          {item.order_id}
        </span>
      ),
    },
    {
      key: 'user',
      header: '用户',
      render: (item) => (
        <span className="text-gray-700">{item.user?.username ?? '-'}</span>
      ),
    },
    {
      key: 'amount_cents',
      header: '金额',
      render: (item) => (
        <span className="text-gray-700">{fmtPrice(item.amount_cents)}</span>
      ),
    },
    {
      key: 'amount_stones',
      header: '风铃石数',
      render: (item) => (
        <span className="text-gray-700 tabular-nums">{item.amount_stones}</span>
      ),
    },
    {
      key: 'stones_change',
      header: '余额变更',
      render: (item) => (
        <div className="text-xs leading-tight tabular-nums">
          <span className="text-gray-400">{item.old_stones}</span>
          <span className="text-gray-500"> → </span>
          <span className="text-gray-700">{item.new_stones}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (item) => (
        <StatusBadge status={item.status} config={ORDER_STATUS_BADGE_CONFIG} />
      ),
    },
    {
      key: 'operator',
      header: '操作人',
      render: (item) => {
        const name = item.operator_user?.username
        return (
          <span className="text-gray-500 text-xs">
            {name === 'system' || !name ? '自动' : name}
          </span>
        )
      },
    },
    {
      key: 'created_at',
      header: '时间',
      render: (item) => (
        <span className="text-gray-500 text-xs">
          {fmtDateTime(item.created_at)}
        </span>
      ),
    },
  ]

  const isMember = orderType === 'membership'

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">订单记录</h3>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="用户ID"
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg"
        >
          <option value="">全部状态</option>
          <option value="paid">已支付</option>
          <option value="pending">待支付</option>
          <option value="cancelled">已取消</option>
          <option value="expired">已过期</option>
        </select>
        <input
          type="text"
          placeholder="账号"
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-40"
        />
        <button
          onClick={handleSearch}
          className="inline-flex items-center gap-1.5 h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Search className="w-4 h-4" />
          搜索
        </button>
      </div>

      {/* 二级 pill 切换 */}
      <div className="flex gap-1">
        {[
          { key: 'membership' as const, label: '会员订单' },
          { key: 'stone' as const, label: '风铃石订单' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTypeChange(key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              orderType === key
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* DataTable */}
      <DataTable<MembershipOrder | StoneOrder>
        columns={
          isMember
            ? (memberColumns as DataTableColumn<MembershipOrder | StoneOrder>[])
            : (stoneColumns as DataTableColumn<MembershipOrder | StoneOrder>[])
        }
        data={isMember ? memberOrders : stoneOrders}
        keyExtractor={(item) => item.order_id}
        gridTemplateColumns={
          isMember
            ? '120px 80px 60px 48px 48px 64px 36px 56px 100px 56px 100px'
            : '120px 80px 64px 72px 100px 56px 56px 120px'
        }
        isLoading={isMember ? memberLoading : stoneLoading}
        error={isMember ? memberError : stoneError}
        errorMessage={
          isMember ? `加载失败: ${memberError}` : `加载失败: ${stoneError}`
        }
        onRetry={() =>
          isMember
            ? fetchMemberOrders(memberPage)
            : fetchStoneOrders(stonePage)
        }
        emptyTitle="暂无订单记录"
        emptyDescription="当前筛选条件下没有订单"
        rowClassName="text-xs"
      />

      {/* Pagination */}
      {(isMember ? memberOrders.length : stoneOrders.length) > 0 && (
        <Pagination
          page={isMember ? memberPage : stonePage}
          total={isMember ? memberTotal : stoneTotal}
          pageSize={PAGE_SIZE}
          onChange={isMember ? setMemberPage : setStonePage}
        />
      )}
    </div>
  )
}
