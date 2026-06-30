"use client"

import { useState, useEffect, useCallback } from "react"
import { adminApi, type AdminUserInfo, type ProxyLong } from "@/lib/api/admin"
import { isAdminRole } from '@/lib/constants/admin'
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { SlidePanel } from "@/components/ui/slide-panel"
import { ProxyItem } from "@/components/ui/proxy-item"
import { toast } from "sonner"
import { Users, RefreshCw, Link2 } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"

const PAGE_SIZE = 20


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
    <SlidePanel open={open} onClose={onClose} title="代理管理" subtitle={username}>
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
    </SlidePanel>
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

  const openPanel = (user: AdminUserInfo) => {
    setSelectedUserId(user.userId)
    setSelectedUsername(user.username || user.userId || "")
    setShowPanel(true)
  }

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">用户管理</h1>
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
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无用户</h3>
          <p className="text-sm text-gray-500">系统中还没有注册用户</p>
        </div>
      )}

      {/* 表格 */}
      {!loading && !error && users.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-10 gap-2 px-4 py-3 bg-gray-100 border-b border-gray-100 text-sm font-medium text-gray-600">
            <div className="col-span-2">用户名</div>
            <div className="col-span-2">联系方式</div>
            <div className="col-span-1">角色</div>
            <div className="col-span-1">状态</div>
            <div className="col-span-2">店铺数</div>
            <div className="col-span-2">代理IP</div>
          </div>

          {users.map((user, index) => (
            <div
              key={user.userId}
              className={`grid grid-cols-10 gap-2 px-4 py-3 items-center text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 ${
                index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
              }`}
            >
              {/* 用户名 */}
              <div className="col-span-2 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {user.username}
                </div>
                <div className="text-xs text-gray-400 truncate">{user.userId}</div>
              </div>

              {/* 联系方式 — 手机号 + 邮箱 */}
              <div className="col-span-2 min-w-0">
                <div className="text-xs text-gray-700 truncate">
                  {user.phone || "-"}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {user.email || "-"}
                </div>
              </div>

              {/* 角色 */}
              <div className="col-span-1 min-w-0">
                <span className="text-gray-600 text-xs truncate">
                  {isAdminRole(user.role) ? "管理员" : "用户"}
                </span>
              </div>

              {/* 状态 */}
              <div className="col-span-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                    user.is_active
                      ? "text-green-600 bg-green-50"
                      : "text-red-600 bg-red-50"
                  }`}
                >
                  {user.is_active ? "正常" : "禁用"}
                </span>
              </div>

              {/* 店铺数 */}
              <div className="col-span-2 min-w-0">
                <span className="text-gray-700">{user.accountCount ?? 0}</span>
              </div>

              {/* 代理 — 只显示数量，点击打开侧边栏 */}
              <div className="col-span-2 min-w-0">
                <button
                  onClick={() => openPanel(user)}
                  className="w-full text-left"
                >
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
                    {user.proxyCount ?? 0}
                  </span>
                </button>
              </div>
            </div>
          ))}

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
    </div>
  )
}
