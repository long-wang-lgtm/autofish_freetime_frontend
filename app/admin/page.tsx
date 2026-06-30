'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import * as echarts from 'echarts'
import { useAuth } from '@/stores/auth.store'
import { isAdminRole } from '@/lib/constants/admin'
import {
  adminApi,
  type DashboardData,
  type AdminUserInfo,
  type AccountFull,
} from '@/lib/api/admin'
import ImStatusChart from '@/components/ui/echart/ImStatusChart'
import AccountPieChart from '@/components/ui/echart/AccountPieChart'
import { useChart } from '@/components/ui/echart/useChart'
import { Pagination } from '@/components/ui/pagination'

// ===== 常量 =====
const USER_PALETTE = [
  '#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE',
  '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#48C9B0',
]
const OTHER_COLOR = '#cccccc'
const PAGE_SIZE = 20

// ===== 工具 =====
function hashColor(userId: string): string {
  let h = 0
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) - h + userId.charCodeAt(i)) | 0
  }
  return USER_PALETTE[Math.abs(h) % USER_PALETTE.length]
}

function statusLabel(status: number | null): { text: string; cls: string } {
  switch (status) {
    case 1: return { text: '正常', cls: 'bg-green-100 text-green-700' }
    case 2: return { text: '禁用', cls: 'bg-gray-100 text-gray-500' }
    case 3: return { text: '异常', cls: 'bg-red-100 text-red-600' }
    default: return { text: '未知', cls: 'bg-gray-100 text-gray-500' }
  }
}

// ===== 主页面 =====
export default function AdminPage() {
  const { user } = useAuth()

  // --- dashboard 数据 ---
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)

  // --- tab ---
  const [tab, setTab] = useState<'users' | 'accounts'>('users')

  // --- 用户列表 ---
  const [users, setUsers] = useState<AdminUserInfo[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userPage, setUserPage] = useState(1)
  const [userLoading, setUserLoading] = useState(false)

  // --- 账号列表 ---
  const [accounts, setAccounts] = useState<AccountFull[]>([])
  const [accountTotal, setAccountTotal] = useState(0)
  const [accountPage, setAccountPage] = useState(1)
  const [accountLoading, setAccountLoading] = useState(false)

  // --- 初始化 dashboard ---
  useEffect(() => {
    adminApi.getDashboard().then((res) => {
      if (res.success) {
        setDashboard(res.data)
      }
    }).catch(console.error)
    .finally(() => setDashboardLoading(false))
  }, [])

  // --- 加载用户列表 ---
  const fetchUsers = useCallback(async (page: number) => {
    setUserLoading(true)
    try {
      const data = await adminApi.getUserList(page, PAGE_SIZE)
      setUsers(data)
      setUserTotal(data.length === PAGE_SIZE ? (page + 1) * PAGE_SIZE : (page - 1) * PAGE_SIZE + data.length)
    } catch (e) { console.error(e) }
    finally { setUserLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'users') fetchUsers(userPage)
  }, [tab, userPage, fetchUsers])

  // --- 加载账号列表 ---
  const fetchAccounts = useCallback(async (page: number) => {
    setAccountLoading(true)
    try {
      const data = await adminApi.getAccountList(page, PAGE_SIZE)
      setAccounts(data.accounts)
      setAccountTotal(data.total)
    } catch (e) { console.error(e) }
    finally { setAccountLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'accounts') fetchAccounts(accountPage)
  }, [tab, accountPage, fetchAccounts])

  // --- 注册趋势图配置 ---
  const trendOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!dashboard) return null
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = params as { axisValue: string; data: { value: number; users: string[] } }[]
          if (!items.length) return ''
          const p = items[0]
          const { users } = p.data
          const [m, d] = p.axisValue.split('-')
          const dateStr = `${parseInt(m)}月${parseInt(d)}日`
          let html = `<div style="font-size:13px;line-height:1.6">`
          html += `<div style="font-weight:600;color:#1f2937;margin-bottom:4px">${dateStr}</div>`
          html += `<div style="color:#6b7280">新增 <b style="color:#1f2937">${p.data.value}</b> 位用户</div>`
          if (users.length > 0) {
            const shown = users.slice(0, 10)
            const more = users.length > 10 ? ' 等' : ''
            html += `<div style="border-top:1px solid #f3f4f6;margin-top:6px;padding-top:4px;font-size:12px">`
            html += `<span style="color:#9ca3af">包括 </span>`
            html += `<span style="color:#6b7280">${shown.join('、')}${more}</span>`
            html += `</div>`
          }
          html += `</div>`
          return html
        },
      },
      grid: { left: 40, right: 16, top: 16, bottom: 32 },
      xAxis: {
        type: 'category',
        data: dashboard.registration_trend.map((t) => t.date.slice(5)),
        axisLabel: { fontSize: 11, color: '#9ca3af', margin: 8 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 11, color: '#9ca3af', margin: 8 },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [
        {
          type: 'line',
          data: dashboard.registration_trend.map((t) => ({ value: t.count, users: t.users })),
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#5470C6', width: 2 },
          itemStyle: { color: '#5470C6' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(84,112,198,0.2)' },
            { offset: 1, color: 'rgba(84,112,198,0.02)' },
          ])},
        },
      ],
    }
  }, [dashboard])

  // --- 账号注册趋势图配置 ---
  const accountTrendOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!dashboard?.account_registration_trend) return null
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = params as { axisValue: string; data: { value: number; users: string[] } }[]
          if (!items.length) return ''
          const p = items[0]
          const { users } = p.data
          const [m, d] = p.axisValue.split('-')
          const dateStr = `${parseInt(m)}月${parseInt(d)}日`
          let html = `<div style="font-size:13px;line-height:1.6">`
          html += `<div style="font-weight:600;color:#1f2937;margin-bottom:4px">${dateStr}</div>`
          html += `<div style="color:#6b7280">新增 <b style="color:#1f2937">${p.data.value}</b> 个账号</div>`
          if (users.length > 0) {
            const shown = users.slice(0, 10)
            const more = users.length > 10 ? ' 等' : ''
            html += `<div style="border-top:1px solid #f3f4f6;margin-top:6px;padding-top:4px;font-size:12px">`
            html += `<span style="color:#9ca3af">店铺: </br></span>`
            html += `<span style="color:#6b7280">${shown.join('、')}${more}</span>`
            html += `</div>`
          }
          html += `</div>`
          return html
        },
      },
      grid: { left: 40, right: 16, top: 16, bottom: 32 },
      xAxis: {
        type: 'category',
        data: dashboard.account_registration_trend.map((t) => t.date.slice(5)),
        axisLabel: { fontSize: 11, color: '#9ca3af', margin: 8 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 11, color: '#9ca3af', margin: 8 },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [
        {
          type: 'line',
          data: dashboard.account_registration_trend.map((t) => ({ value: t.count, users: t.users })),
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#91CC75', width: 2 },
          itemStyle: { color: '#91CC75' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(145,204,117,0.2)' },
            { offset: 1, color: 'rgba(145,204,117,0.02)' },
          ])},
        },
      ],
    }
  }, [dashboard])

  // --- ECharts refs ---
  const trendRef = useChart<HTMLDivElement>(trendOption, [trendOption])
  const accountTrendRef = useChart<HTMLDivElement>(accountTrendOption, [accountTrendOption])

  // --- 账号颜色映射 ---
  const userColorMap = useMemo(() => {
    if (!dashboard) return {} as Record<string, string>
    const sorted = [...dashboard.account_by_user].sort((a, b) => (b.accountCount ?? 0) - (a.accountCount ?? 0))
    const top10Ids = new Set(sorted.slice(0, 10).map((u) => u.userId))
    const map: Record<string, string> = {}
    for (const item of sorted) {
      const id = item.userId || ''
      if (top10Ids.has(id)) {
        map[id] = hashColor(id)
      } else {
        map[id] = OTHER_COLOR
      }
    }
    return map
  }, [dashboard])

  // ==================== 渲染 ====================
  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const stats = dashboard?.stats

  return (
    <div className="space-y-5">

      {/* ===== 统计卡片 ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="总用户数" value={stats?.total_users}
          icon={<UserIcon />} bg="bg-blue-50" fg="text-blue-600"
        />
        <StatCard
          label="今日新增" value={stats?.today_new_users}
          icon={<NewIcon />} bg="bg-emerald-50" fg="text-emerald-600"
          highlight
        />
        <StatCard
          label="总账号数" value={stats?.total_accounts}
          icon={<AccountIcon />} bg="bg-indigo-50" fg="text-indigo-600"
        />
        <StatCard
          label="正常账号" value={stats?.normal_accounts}
          icon={<CheckIcon />} bg="bg-green-50" fg="text-green-600"
        />
        <StatCard
          label="禁用账号" value={stats?.disabled_accounts}
          icon={<PauseIcon />} bg="bg-gray-50" fg="text-gray-500"
        />
        <StatCard
          label="异常账号" value={stats?.error_accounts}
          icon={<WarnIcon />} bg="bg-red-50" fg="text-red-600"
        />
      </div>

      {/* ===== 图表行：左饼图 + 中右趋势图 ===== */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 账号分布饼图 */}
        <AccountPieChart data={dashboard?.account_by_user ?? []} className="lg:w-72 lg:shrink-0" />

        {/* 两个趋势图 — 占据剩余空间 */}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 用户注册趋势 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">用户注册趋势（近30天）</h3>
            <div ref={trendRef} className="w-full" style={{ height: 260 }} />
          </div>
          {/* 账号注册趋势 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">店铺注册趋势（近30天）</h3>
            <div ref={accountTrendRef} className="w-full" style={{ height: 260 }} />
          </div>
        </div>
      </div>

      {/* ===== IM 服务运行状态趋势图 ===== */}
      <ImStatusChart />

      {/* ===== 一级 Tab 栏（外置于卡片） ===== */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setTab('users'); setUserPage(1) }}
          className={
            'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' +
            (tab === 'users'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700')
          }
        >
          用户列表
        </button>
        <button
          onClick={() => { setTab('accounts'); setAccountPage(1) }}
          className={
            'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' +
            (tab === 'accounts'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700')
          }
        >
          账号列表
        </button>
      </div>

      {/* ===== 列表内容（卡片内） ===== */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {tab === 'users' ? (
          <UserTable
            users={users}
            total={userTotal}
            page={userPage}
            loading={userLoading}
            onPageChange={setUserPage}
          />
        ) : (
          <AccountTable
            accounts={accounts}
            total={accountTotal}
            page={accountPage}
            loading={accountLoading}
            onPageChange={setAccountPage}
            userColorMap={userColorMap}
          />
        )}
      </div>
    </div>
  )
}

// ===== 统计卡片 =====
function StatCard({
  label, value, icon, bg, fg, highlight,
}: {
  label: string
  value: number | undefined
  icon: React.ReactNode
  bg: string
  fg: string
  highlight?: boolean
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        <span className={fg}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${highlight ? 'text-emerald-600' : 'text-gray-900'}`}>
          {value ?? '—'}
        </p>
      </div>
    </div>
  )
}

// ===== 用户列表 =====
function UserTable({
  users, total, page, loading, onPageChange,
}: {
  users: AdminUserInfo[]
  total: number
  page: number
  loading: boolean
  onPageChange: (p: number) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <Th>用户名</Th>
            <Th>邮箱</Th>
            <Th>角色</Th>
            <Th>账号数</Th>
            <Th>最后登录</Th>
            <Th>注册时间</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6}><LoadingRow /></td></tr>
          ) : users.length === 0 ? (
            <tr><td colSpan={6}><EmptyRow /></td></tr>
          ) : (
            users.map((u) => (
              <tr key={u.userId} className="border-b border-gray-50 hover:bg-gray-50/50">
                <Td>
                  <span className="font-medium text-gray-900">{u.username}</span>
                </Td>
                <Td>{u.email || '—'}</Td>
                <Td>
                  <span className={
                    'inline-block px-2 py-0.5 text-xs rounded-full ' +
                    isAdminRole(u.role
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600')
                  }>
                    {isAdminRole(u.role) ? '管理员' : '用户'}
                  </span>
                </Td>
                <Td>{u.accountCount}</Td>
                <Td className="text-gray-500">
                  {u.last_login
                    ? new Date(u.last_login).toLocaleDateString('zh-CN', {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                      })
                    : '从未登录'}
                </Td>
                <Td className="text-gray-500">
                  {new Date(u.created_at!).toLocaleDateString('zh-CN')}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="px-4 pb-4">
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={onPageChange} />
      </div>
    </div>
  )
}

// ===== 账号列表 =====
function AccountTable({
  accounts, total, page, loading, onPageChange, userColorMap,
}: {
  accounts: AccountFull[]
  total: number
  page: number
  loading: boolean
  onPageChange: (p: number) => void
  userColorMap: Record<string, string>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <Th className="w-8" />
            <Th>账号名</Th>
            <Th>UID</Th>
            <Th>归属用户</Th>
            <Th>状态</Th>
            <Th>在售商品</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6}><LoadingRow /></td></tr>
          ) : accounts.length === 0 ? (
            <tr><td colSpan={6}><EmptyRow /></td></tr>
          ) : (
            accounts.map((a) => {
              const st = statusLabel(a.status)
              return (
                <tr key={a.uid} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <Td className="w-8 pr-0">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: userColorMap[a.user?.userId || ''] || OTHER_COLOR }}
                    />
                  </Td>
                  <Td>
                    <span className="font-medium text-gray-900">{a.name || '未命名'}</span>
                  </Td>
                  <Td className="text-gray-500 font-mono text-xs">{a.uid}</Td>
                  <Td>{a.user?.username || '—'}</Td>
                  <Td>
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${st.cls}`}>
                      {st.text}
                    </span>
                  </Td>
                  <Td>{a.onsaleitemCount}</Td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      <div className="px-4 pb-4">
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={onPageChange} />
      </div>
    </div>
  )
}

// ===== 表格小组件 =====
function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className || ''}`}>
      {children}
    </th>
  )
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-gray-700 ${className || ''}`}>
      {children}
    </td>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
      加载中...
    </div>
  )
}

function EmptyRow() {
  return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
      暂无数据
    </div>
  )
}

// ===== 图标 =====
function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function AccountIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}
function NewIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function WarnIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  )
}
