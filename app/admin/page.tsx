'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as echarts from 'echarts'
import { useAuth } from '@/stores/auth.store'
import {
  adminApi,
  subscribeImStatus,
  type DashboardData,
  type AdminUserInfo,
  type AdminAccountInfo,
  type ImStatusSnapshot,
} from '@/lib/api/administrators'

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

function statusLabel(status: number): { text: string; cls: string } {
  switch (status) {
    case 1: return { text: '正常', cls: 'bg-green-100 text-green-700' }
    case 2: return { text: '禁用', cls: 'bg-gray-100 text-gray-500' }
    case 3: return { text: '异常', cls: 'bg-red-100 text-red-600' }
    default: return { text: '未知', cls: 'bg-gray-100 text-gray-500' }
  }
}

// ===== ECharts 封装 =====
function useChart<T extends HTMLElement>(
  option: echarts.EChartsOption | null,
  deps: unknown[],
) {
  const ref = useRef<T>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current || !option) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current)
    }
    chartRef.current.setOption(option, true)
  }, deps)

  useEffect(() => {
    const chart = chartRef.current
    return () => {
      if (chart) chart.dispose()
    }
  }, [])

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return ref
}

// ===== 分页控件 =====
function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number
  total: number
  pageSize: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm rounded-md border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        上一页
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dot-${i}`} className="px-2 text-gray-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={
              'px-3 py-1.5 text-sm rounded-md border ' +
              (p === page
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 hover:bg-gray-50')
            }
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm rounded-md border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        下一页
      </button>
      <span className="ml-3 text-xs text-gray-500">
        共 {total} 条
      </span>
    </div>
  )
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
  const [accounts, setAccounts] = useState<AdminAccountInfo[]>([])
  const [accountTotal, setAccountTotal] = useState(0)
  const [accountPage, setAccountPage] = useState(1)
  const [accountLoading, setAccountLoading] = useState(false)

  // --- IM 状态监控 ---
  const [imSnapshots, setImSnapshots] = useState<ImStatusSnapshot[]>([])

  useEffect(() => {
    const abort = subscribeImStatus(
      (snapshot) => setImSnapshots((prev) => [...prev.slice(-99), snapshot]),
    )
    return abort
  }, [])

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
      const res = await adminApi.getUsers(page, PAGE_SIZE)
      if (res.success) {
        setUsers(res.data.items)
        setUserTotal(res.data.total)
      }
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
      const res = await adminApi.getAccounts(page, PAGE_SIZE)
      if (res.success) {
        setAccounts(res.data.items)
        setAccountTotal(res.data.total)
      }
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
            html += `<span style="color:#9ca3af">归属 </span>`
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

  // --- 账号分布饼图配置 ---
  const pieOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!dashboard) return null
    const sorted = [...dashboard.account_by_user].sort((a, b) => b.count - a.count)
    const top10 = sorted.slice(0, 10)
    const otherCount = sorted.slice(10).reduce((s, i) => s + i.count, 0)

    const data: { name: string; value: number; itemStyle: { color: string } }[] = top10.map(
      (item, i) => ({
        name: item.username,
        value: item.count,
        itemStyle: { color: USER_PALETTE[i] },
      }),
    )
    if (otherCount > 0) {
      data.push({
        name: '其他用户',
        value: otherCount,
        itemStyle: { color: OTHER_COLOR },
      })
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 个账号 ({d}%)',
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        bottom: 0,
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 10, color: '#6b7280' },
      },
      series: [
        {
          type: 'pie',
          radius: ['42%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          label: {
            position: 'inside',
            fontSize: 11,
            color: '#fff',
            formatter: '{c}',
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
          },
          data,
        },
      ],
    }
  }, [dashboard])

  // --- IM 状态趋势图配置 ---
  const imStatusOption = useMemo<echarts.EChartsOption | null>(() => {
    if (imSnapshots.length === 0) return null
    const formatTime = (ts: number) => {
      const d = new Date(ts * 1000)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number; color: string; dataIndex: number }[]
          if (!items.length) return ''
          const ts = imSnapshots[items[0].dataIndex]?.timestamp
          const timeStr = ts ? new Date(ts * 1000).toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
          }) : ''
          let html = `<div style="font-size:13px;line-height:1.6">`
          html += `<div style="font-weight:600;color:#1f2937;margin-bottom:4px">${timeStr}</div>`
          for (const item of items) {
            html += `<div style="color:#6b7280"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:6px"></span>${item.seriesName}: <b style="color:#1f2937">${item.value}</b></div>`
          }
          html += `</div>`
          return html
        },
      },
      grid: { left: 48, right: 24, top: 16, bottom: 32 },
      xAxis: {
        type: 'category',
        data: imSnapshots.map((s) => formatTime(s.timestamp)),
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
          name: '总账号',
          type: 'line',
          data: imSnapshots.map((s) => s.total_accounts),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#9ca3af', type: 'dashed', width: 1.5 },
          itemStyle: { color: '#9ca3af' },
        },
        {
          name: '正常状态',
          type: 'line',
          data: imSnapshots.map((s) => s.active_accounts),
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          lineStyle: { color: '#22c55e', width: 2 },
          itemStyle: { color: '#22c55e' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(34,197,94,0.15)' },
            { offset: 1, color: 'rgba(34,197,94,0.02)' },
          ])},
        },
        {
          name: '运行中',
          type: 'line',
          data: imSnapshots.map((s) => s.running_accounts),
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          lineStyle: { color: '#5470C6', width: 2 },
          itemStyle: { color: '#5470C6' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(84,112,198,0.15)' },
            { offset: 1, color: 'rgba(84,112,198,0.02)' },
          ])},
        },
        {
          name: '任务正常',
          type: 'line',
          data: imSnapshots.map((s) => s.running_tasks),
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          lineStyle: { color: '#f97316', width: 2 },
          itemStyle: { color: '#f97316' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(249,115,22,0.15)' },
            { offset: 1, color: 'rgba(249,115,22,0.02)' },
          ])},
        },
      ],
    }
  }, [imSnapshots])

  // --- ECharts refs ---
  const trendRef = useChart<HTMLDivElement>(trendOption, [trendOption])
  const accountTrendRef = useChart<HTMLDivElement>(accountTrendOption, [accountTrendOption])
  const pieRef = useChart<HTMLDivElement>(pieOption, [pieOption])
  const imStatusRef = useChart<HTMLDivElement>(imStatusOption, [imStatusOption])

  // --- 账号颜色映射 ---
  const userColorMap = useMemo(() => {
    if (!dashboard) return {} as Record<string, string>
    const sorted = [...dashboard.account_by_user].sort((a, b) => b.count - a.count)
    const top10Ids = new Set(sorted.slice(0, 10).map((u) => u.user_id))
    const map: Record<string, string> = {}
    for (const item of sorted) {
      if (top10Ids.has(item.user_id)) {
        map[item.user_id] = hashColor(item.user_id)
      } else {
        map[item.user_id] = OTHER_COLOR
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
          label="总账号数" value={stats?.total_accounts}
          icon={<AccountIcon />} bg="bg-indigo-50" fg="text-indigo-600"
        />
        <StatCard
          label="今日新增" value={stats?.today_new_users}
          icon={<NewIcon />} bg="bg-emerald-50" fg="text-emerald-600"
          highlight
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
        {/* 账号分布饼图 — 方形，窄列 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 lg:w-72 lg:shrink-0">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">账号归属分布</h3>
          {dashboard?.account_by_user.length === 0 ? (
            <div className="flex items-center justify-center text-gray-400 text-sm aspect-square">
              暂无数据
            </div>
          ) : (
            <div ref={pieRef} className="w-full aspect-square" />
          )}
        </div>

        {/* 两个趋势图 — 占据剩余空间 */}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 用户注册趋势 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">用户注册趋势（近30天）</h3>
            <div ref={trendRef} className="w-full" style={{ height: 260 }} />
          </div>
          {/* 账号注册趋势 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">账号注册趋势（近30天）</h3>
            <div ref={accountTrendRef} className="w-full" style={{ height: 260 }} />
          </div>
        </div>
      </div>

      {/* ===== IM 服务运行状态趋势图 ===== */}
      {imSnapshots.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">IM 服务运行状态</h3>
          <div ref={imStatusRef} className="w-full" style={{ height: 280 }} />
        </div>
      )}

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
                    (u.role === 'admin' || u.role === 'administrators'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600')
                  }>
                    {u.role === 'admin' || u.role === 'administrators' ? '管理员' : '用户'}
                  </span>
                </Td>
                <Td>{u.account_count}</Td>
                <Td className="text-gray-500">
                  {u.last_login
                    ? new Date(u.last_login).toLocaleDateString('zh-CN', {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                      })
                    : '从未登录'}
                </Td>
                <Td className="text-gray-500">
                  {new Date(u.created_at).toLocaleDateString('zh-CN')}
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
  accounts: AdminAccountInfo[]
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
                      style={{ backgroundColor: userColorMap[a.user_id] || OTHER_COLOR }}
                    />
                  </Td>
                  <Td>
                    <span className="font-medium text-gray-900">{a.name || '未命名'}</span>
                  </Td>
                  <Td className="text-gray-500 font-mono text-xs">{a.uid}</Td>
                  <Td>{a.username}</Td>
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
