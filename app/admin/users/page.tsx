"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { adminApi, type AdminUserInfo, type ProxyLong } from "@/lib/api/admin"
import { isAdminRole } from '@/lib/constants/admin'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { Sheet } from "@/components/ui/overlay/Sheet"
import { ProxyItem } from "@/components/admin/ProxyItem"
import { toast } from "sonner"
import {
  Users,
  RefreshCw,
  Link2,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Coins,
  MoreHorizontal,
} from "lucide-react"
import { Pagination } from '@/components/ui/data/Pagination'
import { fmtDate } from "@/lib/utils/format"
import { MembershipActionSheet } from "./MembershipActionSheet"

const PAGE_SIZE = 20

/* ===== 等级映射 ===== */
const TIER_LABELS: Record<number, string> = {
  0: "Free",
  1: "Basic",
  2: "Standard",
  3: "Pro",
}

const TIER_COLORS: Record<number, string> = {
  0: "text-gray-600 bg-gray-100",
  1: "text-blue-600 bg-blue-50",
  2: "text-amber-600 bg-amber-50",
  3: "text-purple-600 bg-purple-50",
}

function getTierBadge(tier: number | null | undefined) {
  const t = tier ?? 0
  return TIER_COLORS[t] ?? "text-gray-600 bg-gray-100"
}

function getTierLabel(tier: number | null | undefined) {
  const t = tier ?? 0
  return TIER_LABELS[t] ?? `Tier ${t}`
}


/* ===== 代理管理面板 ===== */
function ProxyManagePanel({
  open,
  onClose,
  userId,
  username,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  userId: string
  username: string
  onSuccess: () => void
}) {
  const [boundProxies, setBoundProxies] = useState<ProxyLong[]>([])
  const [bindableProxies, setBindableProxies] = useState<ProxyLong[]>([])
  const [loading, setLoading] = useState(true)
  const [unbindingId, setUnbindingId] = useState<number | null>(null)
  const [bindingId, setBindingId] = useState<number | null>(null)

  useEffect(() => {
    if (open && userId) {
      setLoading(true)
      Promise.all([
        adminApi.getUserProxies(userId),
        adminApi.getBindableProxies(),
      ])
        .then(([bound, bindable]) => {
          setBoundProxies(bound || [])
          const boundIds = new Set((bound || []).map((p) => p.id))
          setBindableProxies((bindable || []).filter((p) => !boundIds.has(p.id)))
        })
        .catch((e) => toast.error(`${e}`))
        .finally(() => setLoading(false))
    }
  }, [open, userId])

  const handleUnbind = async (proxyId: number) => {
    setUnbindingId(proxyId)
    try {
      await adminApi.unbindUserProxy(userId, proxyId)
      toast.success("已解绑")
      const removed = boundProxies.find((p) => p.id === proxyId)
      setBoundProxies((prev) => prev.filter((p) => p.id !== proxyId))
      if (removed) setBindableProxies((prev) => [removed, ...prev])
      onSuccess()
    } catch (err) {
      toast.error(`解绑失败: ${err}`)
    } finally {
      setUnbindingId(null)
    }
  }

  const handleBind = async (proxyId: number) => {
    setBindingId(proxyId)
    try {
      await adminApi.bindUserProxy(userId, proxyId)
      toast.success("绑定成功")
      const added = bindableProxies.find((p) => p.id === proxyId)
      setBindableProxies((prev) => prev.filter((p) => p.id !== proxyId))
      if (added) setBoundProxies((prev) => [...prev, added])
      onSuccess()
    } catch (err) {
      toast.error(`绑定失败: ${err}`)
    } finally {
      setBindingId(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="代理管理" subtitle={username}>
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-6">
          {/* 已绑定代理 */}
          <section>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              已绑定代理
              {boundProxies.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-400 font-normal">({boundProxies.length})</span>
              )}
            </h4>
            {boundProxies.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-6 bg-gray-50 rounded-lg">
                <Link2 className="w-4 h-4 mx-auto mb-1 opacity-50" />
                暂无绑定代理
              </div>
            ) : (
              <div className="space-y-2">
                {boundProxies.map((p) => (
                  <ProxyItem
                    key={p.id}
                    proxy={p}
                    variant="bound"
                    actionLabel="解绑"
                    actionLoading={unbindingId === p.id}
                    onAction={() => handleUnbind(p.id!)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 可绑定代理 */}
          <section>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              可绑定代理
              {bindableProxies.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-400 font-normal">({bindableProxies.length})</span>
              )}
            </h4>
            {bindableProxies.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-6 bg-gray-50 rounded-lg">
                暂无可绑定的代理
              </div>
            ) : (
              <div className="space-y-2">
                {bindableProxies.map((p) => (
                  <ProxyItem
                    key={p.id}
                    proxy={p}
                    variant="bindable"
                    actionLabel="绑定"
                    actionLoading={bindingId === p.id}
                    onAction={() => handleBind(p.id!)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Sheet>
  )
}

/* ===== 主页面 ===== */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserInfo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showPanel, setShowPanel] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUsername, setSelectedUsername] = useState<string>("")

  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getUserList(p, PAGE_SIZE)
      const list = data || []
      setUsers(list)
      setTotal(
        list.length === PAGE_SIZE
          ? (p + 1) * PAGE_SIZE
          : (p - 1) * PAGE_SIZE + list.length,
      )
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(page)
  }, [page, fetchUsers])

  // ---- 会员操作 Sheet 状态 ----
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [actionType, setActionType] = useState<
    "upgrade" | "downgrade" | "renew" | "recharge"
  >("upgrade")
  const [actionUser, setActionUser] = useState<AdminUserInfo | null>(null)

  // ---- 下拉菜单状态 ----
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null)

  const openPanel = (user: AdminUserInfo) => {
    setSelectedUserId(user.userId)
    setSelectedUsername(user.username || user.userId || "")
    setShowPanel(true)
  }

  const openActionSheet = (
    a: "upgrade" | "downgrade" | "renew" | "recharge",
    user: AdminUserInfo,
  ) => {
    setActionType(a)
    setActionUser(user)
    setActionSheetOpen(true)
  }

  const toggleMenu = (userId: string) => {
    setOpenMenuUserId((prev) => (prev === userId ? null : userId))
  }

  // 点击菜单外部时自动关闭
  useEffect(() => {
    if (!openMenuUserId) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-menu-container]")) {
        setOpenMenuUserId(null)
      }
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [openMenuUserId])

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">用户管理</h1>
        </div>
        <button
          onClick={() => fetchUsers(page)}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      {/* 加载 / 错误 / 空 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          加载失败: {error}
        </div>
      )}
      {!loading && !error && users.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无用户</h3>
          <p className="text-sm text-gray-500">系统中还没有注册用户</p>
        </div>
      )}

      {/* 表格 */}
      {!loading && !error && users.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div
            className="px-4 py-3 bg-gray-100 border-b border-gray-100 text-xs font-medium text-gray-500 grid items-center gap-2"
            style={{
              gridTemplateColumns:
                "2fr 2fr 1fr 1fr 2fr 2fr 1fr 1fr 1fr",
            }}
          >
            <div>用户名</div>
            <div>联系方式</div>
            <div>角色</div>
            <div>状态</div>
            <div>会员</div>
            <div>风铃石</div>
            <div>店铺</div>
            <div>代理</div>
            <div className="text-center">操作</div>
          </div>

          {users.map((user, index) => {
            const currentTier = user.plan?.tier ?? 0
            const maxTier = 3 // Pro

            return (
              <div
                key={user.userId}
                className={`grid items-center gap-2 px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                }`}
                style={{
                  gridTemplateColumns:
                    "2fr 2fr 1fr 1fr 2fr 2fr 1fr 1fr 1fr",
                }}
              >
                {/* 用户名 */}
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{user.userId}</div>
                </div>

                {/* 联系方式 */}
                <div className="min-w-0">
                  <div className="text-xs text-gray-700 truncate">
                    {user.phone || "-"}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {user.email || "-"}
                  </div>
                </div>

                {/* 角色 */}
                <div className="min-w-0">
                  <span className="text-gray-600 text-xs truncate">
                    {isAdminRole(user.role) ? "管理员" : "用户"}
                  </span>
                </div>

                {/* 状态 */}
                <div>
                  <span
                    className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full ${
                      user.is_active
                        ? "text-green-600 bg-green-50"
                        : "text-red-600 bg-red-50"
                    }`}
                  >
                    {user.is_active ? "正常" : "禁用"}
                  </span>
                </div>

                {/* 会员等级 + 到期时间 */}
                <div className="min-w-0 leading-tight">
                  <span
                    className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full ${getTierBadge(currentTier)}`}
                  >
                    {getTierLabel(currentTier)}
                  </span>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {user.plan_expires_at ? fmtDate(user.plan_expires_at) : "—"}
                  </div>
                </div>

                {/* 风铃石余额 */}
                <div className="min-w-0 leading-tight tabular-nums">
                  <div className="text-xs text-gray-700">
                    <span className="text-gray-400">充值</span>{" "}
                    {(user.stones ?? 0).toLocaleString("zh-CN")}
                  </div>
                  <div className="text-xs text-gray-700">
                    <span className="text-gray-400">赠送</span>{" "}
                    {(user.stones_bonus ?? 0).toLocaleString("zh-CN")}
                  </div>
                </div>

                {/* 店铺数 */}
                <div className="min-w-0">
                  <span className="text-gray-700">{user.accountCount ?? 0}</span>
                </div>

                {/* 代理 */}
                <div className="min-w-0">
                  <button
                    onClick={() => openPanel(user)}
                    className="w-full text-left"
                  >
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors">
                      {user.proxyCount ?? 0}
                    </span>
                  </button>
                </div>

                {/* 操作下拉菜单 */}
                <div className="relative flex justify-center" data-menu-container>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMenu(user.userId!)
                    }}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </button>
                  {openMenuUserId === user.userId && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-[120px]">
                      {currentTier < maxTier && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuUserId(null)
                            openActionSheet("upgrade", user)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-green-500" />
                          升级会员
                        </button>
                      )}
                      {currentTier > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuUserId(null)
                            openActionSheet("downgrade", user)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-red-500" />
                          降级会员
                        </button>
                      )}
                      {currentTier > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuUserId(null)
                            openActionSheet("renew", user)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <RotateCw className="w-3.5 h-3.5 text-blue-500" />
                          续费会员
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuUserId(null)
                          openActionSheet("recharge", user)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        充值风铃石
                      </button>
                    </div>
                  )}
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

      {/* 代理管理侧边栏 */}
      {selectedUserId && (
        <ProxyManagePanel
          open={showPanel}
          onClose={() => {
            setShowPanel(false)
            setSelectedUserId(null)
          }}
          userId={selectedUserId}
          username={selectedUsername}
          onSuccess={() => fetchUsers(page)}
        />
      )}

      {/* 会员操作 Sheet */}
      {actionUser && (
        <MembershipActionSheet
          open={actionSheetOpen}
          onClose={() => {
            setActionSheetOpen(false)
            setActionUser(null)
          }}
          action={actionType}
          user={actionUser}
          onSuccess={() => fetchUsers(page)}
        />
      )}
    </div>
  )
}
