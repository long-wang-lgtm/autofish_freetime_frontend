"use client"

import { useState, useEffect, useCallback } from "react"
import { adminApi, type AccountFull, type ProxyLong } from "@/lib/api/admin"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { SlidePanel } from "@/components/ui/slide-panel"
import { toast } from "sonner"
import {
  Bot, Truck, Zap, Star, Sparkles, Bell, BellOff, Play, Square, Link2,
} from "lucide-react"
import { ProxyItem } from "@/components/ui/proxy-item"
import { ImStatusChart } from "@/components/ui/echart/ImStatusChart"
import { AccountPieChart } from "@/components/ui/echart/AccountPieChart"
import type { AccountByUserItem } from "@/lib/api/admin"

const PAGE_SIZE = 20

import { Pagination } from '@/components/ui/pagination'

// ===== 只读开关图标 =====
function ReadonlyToggle({
  enabled,
  icon: Icon,
  colorClass,
  label,
}: {
  enabled: boolean | null
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  label: string
}) {
  return (
    <div
      className={`p-1.5 rounded-lg ${enabled ? colorClass : "text-gray-300 bg-gray-100"}`}
      title={`${label}：${enabled ? "开" : "关"}`}
    >
      <Icon className="w-4 h-4" />
    </div>
  )
}

// ===== 配置内容指示 =====
function ConfigDot({ value, label }: { value: string | null; label: string }) {
  const hasValue = value && value.trim().length > 0
  return (
    <span
      className={`text-sm ${hasValue ? "text-blue-600 font-medium" : "text-gray-400"}`}
      title={hasValue ? value : `未配置${label}`}
    >
      {hasValue ? "已配置" : "未配置"}
    </span>
  )
}

// 代理选择侧边栏 — 已绑定(仅展示) + 可绑定(用户其余代理)
// 店铺不支持解绑，绑定新代理即替换旧代理
function ProxySelectPanel({
  open,
  onClose,
  uid,
  userId,
  accountName,
  boundProxy,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  uid: string
  userId: string
  accountName: string
  /** 店铺当前绑定的代理（直接取自账号列表数据，无需额外请求） */
  boundProxy: ProxyLong | null
  onSuccess: () => void
}) {
  const [userProxies, setUserProxies] = useState<ProxyLong[]>([])
  const [loading, setLoading] = useState(true)
  const [bindingId, setBindingId] = useState<number | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  useEffect(() => {
    if (open && userId) {
      setLoading(true)
      adminApi.getUserProxies(userId)
        .then((data) => setUserProxies(data || []))
        .catch((err) => toast.error(`${err}`))
        .finally(() => setLoading(false))
    }
  }, [open, userId])

  // 可绑定列表 = 用户代理中排除已绑定的那个
  const bindableProxies = userProxies.filter((p) => p.id !== boundProxy?.id)

  const handleBindClick = (proxyId: number) => {
    // 已有绑定代理时，先进入确认状态
    if (boundProxy) {
      setConfirmingId(proxyId)
      return
    }
    doBind(proxyId)
  }

  const doBind = async (proxyId: number) => {
    setBindingId(proxyId)
    setConfirmingId(null)
    try {
      await adminApi.bindAccountProxy(uid, proxyId)
      toast.success("代理绑定成功")
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(`绑定失败: ${err}`)
    } finally {
      setBindingId(null)
    }
  }

  return (
    <SlidePanel open={open} onClose={onClose} title="选择代理" subtitle={accountName}>
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-6">
          {/* 已绑定代理 — 仅展示，不支持解绑 */}
          <section>
            <h4 className="text-sm font-medium text-gray-700 mb-2">已绑定代理</h4>
            {boundProxy ? (
              <ProxyItem proxy={boundProxy} variant="bound" />
            ) : (
              <div className="text-center text-gray-400 text-sm py-6 bg-gray-50 rounded-lg">
                <Link2 className="w-4 h-4 mx-auto mb-1 opacity-50" />
                暂未绑定代理
              </div>
            )}
          </section>

          {/* 可绑定代理 */}
          <section>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              可绑定代理
              {userProxies.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-400 font-normal">({bindableProxies.length})</span>
              )}
            </h4>
            {userProxies.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-6 bg-gray-50 rounded-lg">
                <Link2 className="w-4 h-4 mx-auto mb-1 opacity-50" />
                该用户暂未分配任何代理
              </div>
            ) : bindableProxies.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-6 bg-gray-50 rounded-lg">
                暂无可绑定的代理
              </div>
            ) : (
              <div className="space-y-2">
                {bindableProxies.map((p) => {
                  const isConfirming = confirmingId === p.id
                  return isConfirming ? (
                    <div key={p.id} className="p-3 border border-amber-200 rounded-lg bg-amber-50/60">
                      <div className="min-w-0">
                        <div className="font-mono text-sm text-gray-900 truncate">{p.server}</div>
                        <p className="text-xs text-amber-700 mt-1">
                          ⚠ 绑定后将自动解绑原代理「{boundProxy?.server}」
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => doBind(p.id!)}
                          disabled={bindingId === p.id}
                          className="px-3 py-1 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                        >
                          {bindingId === p.id ? <LoadingSpinner size="sm" /> : "确认绑定"}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="px-3 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ProxyItem
                      key={p.id}
                      proxy={p}
                      variant="bindable"
                      actionLabel="绑定"
                      actionLoading={bindingId === p.id}
                      onAction={() => handleBindClick(p.id!)}
                    />
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </SlidePanel>
  )
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AccountFull[]>([])
  const [statuslist, setStatuslist] = useState<Record<string, boolean>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingUid, setTogglingUid] = useState<string | null>(null)

  const [showProxySelect, setShowProxySelect] = useState(false)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedAccountName, setSelectedAccountName] = useState<string>("")
  const [selectedBoundProxy, setSelectedBoundProxy] = useState<ProxyLong | null>(null)

  // --- 饼图数据 ---
  const [pieData, setPieData] = useState<AccountByUserItem[]>([])
  const [pieLoading, setPieLoading] = useState(true)

  useEffect(() => {
    adminApi.getDashboard().then((res) => {
      if (res.success) {
        setPieData(res.data.account_by_user)
      }
    }).catch(console.error)
    .finally(() => setPieLoading(false))
  }, [])

  const fetchAccounts = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getAccountList(p, PAGE_SIZE)
      setAccounts(data.accounts)
      setStatuslist(data.statuslist)
      setTotal(data.total)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts(page)
  }, [page, fetchAccounts])

  const handleToggleIm = async (uid: string) => {
    if (!uid || togglingUid) return
    setTogglingUid(uid)
    const isRunning = statuslist[uid] ?? false
    try {
      if (isRunning) {
        await adminApi.stopIm(uid)
        toast.success("IM 服务已停止")
      } else {
        await adminApi.startIm(uid)
        toast.success("IM 服务已启动")
      }
      setStatuslist((prev) => ({ ...prev, [uid]: !isRunning }))
    } catch (e) {
      toast.error(`操作失败: ${e}`)
    } finally {
      setTogglingUid(null)
    }
  }

  const handleBindProxy = (uid: string) => {
    const account = accounts.find(a => a.uid === uid)
    setSelectedUid(uid)
    setSelectedUserId(account?.user?.userId || null)
    setSelectedAccountName(account?.name || uid)
    setSelectedBoundProxy(account?.proxy ?? null)
    setShowProxySelect(true)
  }

  const statusLabels: Record<number, string> = { 1: "正常", 2: "禁用", 3: "异常" }
  const statusColors: Record<number, string> = {
    1: "text-green-600 bg-green-50",
    2: "text-gray-500 bg-gray-100",
    3: "text-red-600 bg-red-50",
  }

  return (
    <div className="space-y-4">
      {/* 标题区 */}
      {/* <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">账号管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            查看所有账号配置，控制 IM 服务启停
          </p>
        </div>
        <button
          onClick={() => fetchAccounts(page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          刷新
        </button>
      </div> */}

      {/* 加载中 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* 加载失败 */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          加载账号列表失败: {error}
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && accounts && accounts.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无账号</h3>
          <p className="text-sm text-gray-500">系统中还没有添加任何账号</p>
        </div>
      )}

      {/* 图表行：左饼图 + 右IM趋势 */}
      <div className="flex flex-col lg:flex-row gap-4">
        <AccountPieChart data={pieData} loading={pieLoading} className="lg:w-64 lg:shrink-0" />
        <div className="flex-1 min-w-0">
          <ImStatusChart />
        </div>
      </div>

      {/* 账号表格 */}
      {!loading && !error && accounts && accounts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-auto max-h-[600px]">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-100 border-b border-gray-100 text-sm font-medium text-gray-600 sticky top-0 z-10">
            <div className="col-span-1">账号信息</div>
            <div className="col-span-1 text-center">状态</div>
            <div className="col-span-1 text-center">商品数量</div>
            <div className="col-span-1 text-center">IM服务</div>
            <div className="col-span-1 text-center">自动免拼</div>
            <div className="col-span-1 text-center">自动发货</div>
            <div className="col-span-1 text-center">自动回复</div>
            <div className="col-span-1 text-center">AI回复</div>
            <div className="col-span-1 text-center">自动评价</div>
            <div className="col-span-1 text-center">自动通知</div>
            <div className="col-span-1 text-center">AI提示词</div>
            <div className="col-span-1 text-center">代理</div>
          </div>

          {accounts.map((account, index) => {
            const uid = account.uid ?? ""
            const imRunning = statuslist[uid] ?? false
            const isToggling = togglingUid === uid
            const isEven = index % 2 === 0

            return (
              <div
                key={uid || index}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors ${
                  isEven ? "bg-white" : "bg-gray-50/30"
                }`}
              >
                {/* 账号信息 */}
                <div className="col-span-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate" title={account.name ?? ""}>
                    {account.name || "未命名"}
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">{uid}</div>
                </div>

                {/* 状态（只读） */}
                <div className="col-span-1 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full ${
                      statusColors[account.status ?? 0] || "text-gray-500 bg-gray-100"
                    }`}
                  >
                    {statusLabels[account.status ?? 0] || "未知"}
                  </span>
                </div>

                {/* 商品数量（只读） */}
                <div className="col-span-1 text-center">
                  <span className="text-gray-700">
                    {account.onsaleitemCount ?? 0}
                    <span className="text-gray-400">/</span>
                    {account.itemtotalCounts ?? 0}
                  </span>
                </div>

                {/* IM服务（唯一可操作项） */}
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    onClick={() => handleToggleIm(uid)}
                    disabled={isToggling || !uid}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isToggling
                        ? "text-gray-400 bg-gray-100 cursor-wait"
                        : imRunning
                          ? "text-green-500 bg-green-50 hover:bg-green-100"
                          : "text-gray-400 bg-gray-100 hover:bg-gray-200"
                    }`}
                    title={imRunning ? "IM 运行中 — 点击停止" : "IM 已停止 — 点击启动"}
                  >
                    {isToggling ? (
                      <LoadingSpinner size="sm" />
                    ) : imRunning ? (
                      <Square className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* 自动免拼（只读） */}
                <div className="col-span-1 flex items-center justify-center">
                  <ReadonlyToggle
                    enabled={account.auto_free}
                    icon={Zap}
                    colorClass="text-amber-500 bg-amber-50"
                    label="自动免拼"
                  />
                </div>

                {/* 自动发货（只读） */}
                <div className="col-span-1 flex items-center justify-center">
                  <ReadonlyToggle
                    enabled={account.auto_delivery}
                    icon={Truck}
                    colorClass="text-green-500 bg-green-50"
                    label="自动发货"
                  />
                </div>

                {/* 自动回复（只读） */}
                <div className="col-span-1 flex items-center justify-center">
                  <ReadonlyToggle
                    enabled={account.auto_reply}
                    icon={Bot}
                    colorClass="text-purple-500 bg-purple-50"
                    label="自动回复"
                  />
                </div>

                {/* AI回复（只读） */}
                <div className="col-span-1 flex items-center justify-center">
                  <ReadonlyToggle
                    enabled={account.ai_auto_reply}
                    icon={Sparkles}
                    colorClass="text-cyan-500 bg-cyan-50"
                    label="AI回复"
                  />
                </div>

                {/* 自动评价（只读） */}
                <div className="col-span-1 flex items-center justify-center">
                  <ReadonlyToggle
                    enabled={account.auto_positive_review}
                    icon={Star}
                    colorClass="text-pink-500 bg-pink-50"
                    label="自动评价"
                  />
                </div>

                {/* 自动通知（只读） */}
                <div className="col-span-1 flex items-center justify-center">
                  <div
                    className={`p-1.5 rounded-lg ${
                      account.auto_notify ? "text-amber-500 bg-amber-50" : "text-gray-300 bg-gray-100"
                    }`}
                    title={`自动通知：${account.auto_notify ? "开" : "关"}`}
                  >
                    {account.auto_notify ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* AI提示词（只读） */}
                <div className="col-span-1 text-center">
                  <ConfigDot
                    value={account.full_ai_reply_system_prompt}
                    label="AI提示词"
                  />
                </div>

                {/* 代理绑定 — 点击整格打开侧边栏 */}
                <div className="col-span-1 min-w-0">
                  <button
                    onClick={() => handleBindProxy(uid)}
                    className="w-full text-left min-w-0 group"
                  >
                    {account.proxy ? (
                      <span className="font-mono text-xs text-gray-700 truncate group-hover:text-blue-600 transition-colors" title={account.proxy.server ?? undefined}>
                        {account.proxy.server}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 group-hover:text-blue-600 transition-colors">
                        <Link2 className="w-3 h-3 inline mr-0.5" />点击绑定
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )
          })}

          <div className="px-4 pb-4">
            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </div>
        </div>
      )}

      {/* 代理选择侧边栏 */}
      {selectedUid && selectedUserId && (
        <ProxySelectPanel
          open={showProxySelect}
          onClose={() => { setShowProxySelect(false); setSelectedUid(null); setSelectedUserId(null) }}
          uid={selectedUid}
          userId={selectedUserId}
          accountName={selectedAccountName}
          boundProxy={selectedBoundProxy}
          onSuccess={() => { fetchAccounts(page) }}
        />
      )}
    </div>
  )
}
