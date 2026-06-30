"use client"

import { useState, useEffect, useCallback } from "react"
import { adminApi, type ProxyLong, type AccountName } from "@/lib/api/admin"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { SlidePanel } from "@/components/ui/slide-panel"
import { toast } from "sonner"
import { Shield, Plus, Trash2, RefreshCw, Search, X, Store } from "lucide-react"

const PAGE_SIZE = 20

const STATUS_LABELS: Record<string, string> = {
  active: "正常", abnormal: "异常", invalid: "失效", expired: "过期", closed: "关闭",
}
const STATUS_COLORS: Record<string, string> = {
  active: "text-green-600 bg-green-50",
  abnormal: "text-red-600 bg-red-50",
  invalid: "text-gray-500 bg-gray-100",
  expired: "text-orange-500 bg-orange-50",
  closed: "text-gray-400 bg-gray-100",
}
const SOURCE_LABELS: Record<string, string> = {
  custom: "自定义", tianqi: "天启API", jiuling: "九零科技",
}
const ACCOUNT_STATUS_LABELS: Record<number, string> = { 1: "正常", 2: "禁用", 3: "异常" }
const ACCOUNT_STATUS_COLORS: Record<number, string> = {
  1: "text-green-600 bg-green-50",
  2: "text-gray-500 bg-gray-100",
  3: "text-red-600 bg-red-50",
}

import { Pagination } from "@/components/ui/pagination"

/* ===== 侧边栏 1：添加代理 ===== */
function ProxyCreatePanel({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ server: "", username: "", password: "", source: "custom", status: "active" })

  useEffect(() => { if (!open) setForm({ server: "", username: "", password: "", source: "custom", status: "active" }) }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.server.trim()) { toast.error("请输入代理IP地址"); return }
    setLoading(true)
    try {
      await adminApi.createProxy(form)
      toast.success("代理创建成功")
      onSuccess(); onClose()
    } catch (err) { toast.error(`${err}`) }
    finally { setLoading(false) }
  }

  return (
    <SlidePanel open={open} onClose={onClose} title="添加代理">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">代理IP地址 *</label>
          <input type="text" value={form.server} onChange={e => setForm({ ...form, server: e.target.value })} placeholder="如: 127.0.0.1:8080" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
            <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="代理账号" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密钥</label>
            <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="代理密钥" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">来源</label>
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400">新增代理默认为代理模式（非直连），创建后不可更改。</p>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? <LoadingSpinner size="sm" /> : "创建"}</button>
        </div>
      </form>
    </SlidePanel>
  )
}

/* ===== 侧边栏 2：编辑代理 + 删除 ===== */
function ProxyEditPanel({ open, onClose, proxy, onSuccess }: { open: boolean; onClose: () => void; proxy: ProxyLong | null; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ server: "", username: "", password: "", source: "" })

  useEffect(() => {
    if (open && proxy) {
      setForm({ server: proxy.server || "", username: proxy.username || "", password: proxy.password || "", source: proxy.source || "custom" })
    }
  }, [open, proxy])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.server.trim()) { toast.error("代理IP地址不能为空"); return }
    setSaving(true)
    try {
      await adminApi.updateProxy(proxy!.id!, form)
      toast.success("保存成功")
      onSuccess()
      onClose()
    } catch (err) { toast.error(`保存失败: ${err}`) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm("确定删除该代理？已绑定的店铺将被解绑。")) return
    setDeleting(true)
    try {
      await adminApi.deleteProxy(proxy!.id!)
      toast.success("已删除")
      onSuccess()
      onClose()
    } catch (err) { toast.error(`删除失败: ${err}`) }
    finally { setDeleting(false) }
  }

  if (!proxy) return null

  return (
    <SlidePanel open={open} onClose={onClose} title="编辑代理" subtitle={proxy.server ?? ""}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">代理IP地址 *</label>
          <input type="text" value={form.server} onChange={e => setForm({ ...form, server: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
            <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密钥</label>
            <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">来源</label>
          <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="text-xs text-gray-400">类型（{proxy.direction ? "直连" : "代理"}）不可修改。</div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button type="button" onClick={handleDelete} disabled={deleting} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">
            {deleting ? <LoadingSpinner size="sm" /> : <Trash2 className="w-4 h-4" />}删除代理
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? <LoadingSpinner size="sm" /> : "保存"}</button>
          </div>
        </div>
      </form>
    </SlidePanel>
  )
}

/* ===== 侧边栏 3：绑定店铺列表 ===== */
function ProxyBindingsPanel({ open, onClose, proxyId }: { open: boolean; onClose: () => void; proxyId: number | null }) {
  const [accounts, setAccounts] = useState<AccountName[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && proxyId) {
      setLoading(true)
      adminApi.getProxyBindings(proxyId)
        .then(d => setAccounts(d || []))
        .catch(e => toast.error(`${e}`))
        .finally(() => setLoading(false))
    }
  }, [open, proxyId])

  return (
    <SlidePanel open={open} onClose={onClose} title="绑定店铺" subtitle={accounts.length > 0 ? `共 ${accounts.length} 个店铺` : undefined}>
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : accounts.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-12">
          <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
          暂无绑定店铺
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {accounts.map(a => (
            <div key={a.uid} className="p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
              <div className="font-medium text-sm text-gray-900 truncate" title={a.name ?? ""}>{a.name || "未命名"}</div>
              <div className="text-xs text-gray-400 font-mono mt-0.5 truncate">{a.uid}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${ACCOUNT_STATUS_COLORS[a.status ?? 0] || "text-gray-500 bg-gray-100"}`}>
                  {ACCOUNT_STATUS_LABELS[a.status ?? 0] || "未知"}
                </span>
                {a.isPro ? <span className="text-xs text-amber-600 bg-amber-50 px-1 py-0.5 rounded-full font-medium">Pro</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </SlidePanel>
  )
}

/* ===== 主页面 ===== */
export default function AdminProxyPage() {
  const [proxies, setProxies] = useState<ProxyLong[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [filteredProxies, setFilteredProxies] = useState<ProxyLong[]>([])

  // 侧边栏状态
  const [showCreate, setShowCreate] = useState(false)
  const [editProxy, setEditProxy] = useState<ProxyLong | null>(null)
  const [showBindings, setShowBindings] = useState(false)
  const [bindingsProxyId, setBindingsProxyId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const fetchProxies = useCallback(async (p: number) => {
    setLoading(true); setError(null)
    try {
      const data = await adminApi.getProxyList(p, PAGE_SIZE, statusFilter || undefined)
      const list = data || []
      setProxies(list)
      setTotal(list.length === PAGE_SIZE ? (p + 1) * PAGE_SIZE : (p - 1) * PAGE_SIZE + list.length)
    } catch (err) { setError(String(err)) }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchProxies(page) }, [page, fetchProxies])

  useEffect(() => {
    let f = proxies
    if (searchText) {
      const lower = searchText.toLowerCase()
      f = f.filter(p => (p.server || "").toLowerCase().includes(lower) || (p.username || "").toLowerCase().includes(lower) || (p.user?.username || "").toLowerCase().includes(lower))
    }
    setFilteredProxies(f)
  }, [proxies, searchText])

  const handleToggleStatus = async (id: number, currentStatus: string | null) => {
    setTogglingId(id)
    try {
      if (currentStatus === "active") await adminApi.closeProxy(id)
      else await adminApi.activeProxy(id)
      toast.success("状态已切换"); fetchProxies(page)
    } catch (err) { toast.error(`切换失败: ${err}`) }
    finally { setTogglingId(null) }
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-600" /><h1 className="text-xl font-semibold text-gray-900">代理设置</h1></div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchProxies(page)} disabled={loading} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />刷新</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" />添加代理</button>
        </div>
      </div>

      {/* 搜索 + 筛选 */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="搜索代理IP、账号、用户..." className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {searchText && <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">状态:</label>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* 加载/错误/空 */}
      {loading && <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>}
      {error && !loading && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">加载失败: {error}</div>}
      {!loading && !error && proxies.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center"><Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-1">暂无代理</h3><p className="text-sm text-gray-500">点击上方按钮添加第一个代理</p></div>
      )}

      {/* 表格 — 无操作列，状态点击切换，店铺只展示数量 */}
      {!loading && !error && filteredProxies.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* 表头: 代理IP(2) 类型(1) 账号(1) 密钥(1) 来源(1) 状态(1) 用户(2) 店铺(3) */}
          <div className="grid grid-cols-9 gap-2 px-4 py-3 bg-gray-100 border-b border-gray-100 text-sm font-medium text-gray-600">
            <div className="col-span-2">代理IP</div>
            <div className="col-span-1">类型</div>
            <div className="col-span-1">账号</div>
            <div className="col-span-1">密钥</div>
            <div className="col-span-1">来源</div>
            <div className="col-span-1">状态</div>
            <div className="col-span-1">用户</div>
            <div className="col-span-1">店铺</div>
          </div>

          {filteredProxies.map((proxy, index) => {
            return (
              <div
                key={proxy.id}
                onClick={() => setEditProxy(proxy)}
                className={`grid grid-cols-9 gap-2 px-4 py-3 items-center text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
              >
                {/* 代理IP */}
                <div className="col-span-2 min-w-0">
                  <span className="font-mono text-gray-900 truncate">{proxy.server}</span>
                </div>

                {/* 类型 */}
                <div className="col-span-1">
                  <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full ${proxy.direction ? "text-blue-600 bg-blue-50" : "text-purple-600 bg-purple-50"}`}>
                    {proxy.direction ? "直连" : "代理"}
                  </span>
                </div>

                {/* 账号 */}
                <div className="col-span-1 min-w-0">
                  <span className="text-gray-700 truncate text-xs">{proxy.username || "-"}</span>
                </div>

                {/* 密钥 */}
                <div className="col-span-1">
                  <span className="font-mono text-xs text-gray-400">••••</span>
                </div>

                {/* 来源 */}
                <div className="col-span-1 min-w-0">
                  <span className="text-gray-600 text-xs truncate">{SOURCE_LABELS[proxy.source || ""] || proxy.source}</span>
                </div>

                {/* 状态 — 点击切换 */}
                <div className="col-span-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(proxy.id!, proxy.status); }}
                    disabled={togglingId === proxy.id}
                    title="点击切换状态"
                  >
                    {togglingId === proxy.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full cursor-pointer hover:ring-2 ring-offset-1 ${STATUS_COLORS[proxy.status || ""] || "text-gray-500 bg-gray-100"}`}>
                        {STATUS_LABELS[proxy.status || ""] || proxy.status}
                      </span>
                    )}
                  </button>
                </div>

                {/* 用户 */}
                <div className="col-span-1 min-w-0">
                  {proxy.user ? (
                    <span className="text-blue-600 text-xs truncate" title={proxy.user.username || proxy.user.userId || ""}>{proxy.user.username || proxy.user.userId}</span>
                  ) : (
                    <span className="text-gray-400 text-xs">未绑定</span>
                  )}
                </div>

                {/* 店铺 — 只显示数量，点击查看全部 */}
                <div className="col-span-1 min-w-0">
                  <button onClick={(e) => { e.stopPropagation(); setBindingsProxyId(proxy.id); setShowBindings(true); }} className="w-full block py-0.5 text-left">
                    <span className="inline-flex items-center min-w-[1.25rem] h-5 px-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors">
                      {proxy.accountCount ?? 0}
                    </span>
                  </button>
                </div>
              </div>
            )
          })}

          <div className="px-4 pb-4"><Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} /></div>
        </div>
      )}

      {/* 三个侧边栏 */}
      <ProxyCreatePanel open={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => fetchProxies(page)} />
      <ProxyEditPanel open={!!editProxy} onClose={() => setEditProxy(null)} proxy={editProxy} onSuccess={() => fetchProxies(page)} />
      <ProxyBindingsPanel open={showBindings} onClose={() => { setShowBindings(false); setBindingsProxyId(null) }} proxyId={bindingsProxyId} />
    </div>
  )
}
