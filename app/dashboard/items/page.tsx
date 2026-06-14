"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listItems, Item, ItemFilters, updateItem, refreshItems } from "@/lib/api/items"
import { getAccountNames, AccountName } from "@/lib/api/accounts"
import { ItemForm } from "@/components/items/ItemForm"
import { ItemKeywordModal } from "@/components/items/ItemKeywordModal"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { listKeywordRules, KeywordRule } from "@/lib/api/keywords"
import { MessageCircle, Bot, Truck, RefreshCw, Upload } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { TabBar } from "@/components/ui/Tab"
import { RuleTable } from "@/components/rules/RuleTable"
import { RuleForm } from "@/components/rules/RuleForm"

function formatPublishTime(timestamp: string | null): string {
  if (!timestamp) return "-"
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function SortIcon({ field, sortField, sortDirection }: {
  field: string
  sortField: string | null
  sortDirection: "asc" | "desc" | null
}) {
  if (sortField !== field) {
    return <span className="text-gray-300">↕</span>
  }
  return sortDirection === "asc" ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
}

function RefreshButton({
  uid,
  onSuccess,
  onError,
}: {
  uid?: string
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (!uid) {
      onError("请先选择账号")
      return
    }
    setIsRefreshing(true)
    try {
      const result = await refreshItems(uid)
      if (result.success) {
        onSuccess()
      } else {
        onError(result.message)
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "刷新失败")
    } finally {
      setIsRefreshing(false)
    }
  }

  const disabled = !uid || isRefreshing

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={disabled}
      title={!uid ? "请先选择账号" : "从闲鱼刷新商品列表"}
      className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${
        disabled
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }`}
    >
      {isRefreshing ? (
        <LoadingSpinner size="sm" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      {isRefreshing ? "刷新中..." : "刷新商品"}
    </button>
  )
}

export default function ItemsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [keywordItem, setKeywordItem] = useState<Item | null>(null)
  const [activeTab, setActiveTab] = useState("items")

  // 关键词规则状态
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [filters, setFilters] = useState<ItemFilters>({
    status: 0,
  })

  // 账号列表查询
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccountNames,
  })

  // 搜索输入状态（用于debounce）
  const [searchInput, setSearchInput] = useState({
    uid: "",
    title: "",
    gid: "",
  })

  // Debounced filters - 400ms 后生效
  const debouncedFilters = useDebounce(searchInput, 400)

  // 当 debouncedFilters 变化时更新 filters
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      uid: debouncedFilters.uid || undefined,
      title: debouncedFilters.title || undefined,
      gid: debouncedFilters.gid || undefined,
    }))
  }, [debouncedFilters])

  const { data, isLoading, error } = useQuery({
    queryKey: ["items", filters],
    queryFn: () => listItems(filters),
    refetchInterval: 30000,
  })

  // 获取关键词规则列表，用于计算每个商品关联的规则数量
  const { data: keywordsData, isLoading: keywordsLoading, error: keywordsError } = useQuery({
    queryKey: ["keywords"],
    queryFn: listKeywordRules,
  })

  // 计算每个商品关联的关键词规则数量
  const itemKeywordCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (keywordsData?.rules) {
      for (const rule of keywordsData.rules) {
        for (const item of rule.linked_item_list) {
          counts[item.item_id] = (counts[item.item_id] || 0) + 1
        }
      }
    }
    return counts
  }, [keywordsData])

  // 关键词规则统计
  const rulesStats = useMemo(() => {
    if (!keywordsData?.rules) return { total: 0, enabled: 0, disabled: 0, linkedItems: 0, linkedGroups: 0 }
    return {
      total: keywordsData.rules.length,
      enabled: keywordsData.rules.filter((r) => r.enabled).length,
      disabled: keywordsData.rules.filter((r) => !r.enabled).length,
      linkedItems: keywordsData.rules.reduce((sum, r) => sum + r.linked_items, 0),
      linkedGroups: keywordsData.rules.reduce((sum, r) => sum + r.linked_groups, 0),
    }
  }, [keywordsData])

  const updateMutation = useMutation({
    mutationFn: ({ gid, data }: { gid: string; data: Parameters<typeof updateItem>[1] }) =>
      updateItem(gid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
    onError: (e: Error) => {
      addToast({ title: "更新失败", description: e.message, variant: "error" })
    },
  })

  const handleToggle = (item: Item, field: "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock") => {
    updateMutation.mutate({
      gid: item.gid,
      data: { [field]: !item[field] },
    })
  }

  const handleClearFilters = () => {
    setSearchInput({ uid: "", title: "", gid: "" })
    setFilters({ status: 0 })
  }

  // 排序状态
  const [sortField, setSortField] = useState<"title" | "price" | "publishTime" | "status" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)

  const handleSort = (field: "title" | "price" | "publishTime" | "status") => {
    if (sortField !== field) {
      setSortField(field)
      setSortDirection("asc")
    } else if (sortDirection === "asc") {
      setSortDirection("desc")
    } else {
      setSortField(null)
      setSortDirection(null)
    }
  }

  // 排序后的数据
  const sortedItems = useMemo(() => {
    if (!sortField || !sortDirection || !data) {
      return data || []
    }
    return [...data].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === "publishTime") {
        aVal = aVal ? Number(aVal) : 0
        bVal = bVal ? Number(bVal) : 0
      } else if (sortField === "price") {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      } else if (sortField === "status") {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      } else {
        aVal = String(aVal || "")
        bVal = String(bVal || "")
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [data, sortField, sortDirection])

  const stats = {
    total: data?.length || 0,
    onSale: data?.filter(i => i.status === 0).length || 0,
    offSale: data?.filter(i => i.status === 1).length || 0,
    sold: data?.filter(i => i.status === -2).length || 0,
    autoReply: data?.filter(i => i.auto_reply).length || 0,
    autoDelivery: data?.filter(i => i.auto_delivery).length || 0,
  }

  return (
    <div className="flex flex-col min-h-0 h-full space-y-5">

      {/* Tab 栏 */}
      <TabBar
        tabs={[
          { key: "items", label: "商品管理" },
          { key: "rules", label: "回复规则" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="overline"
      />

      {/* Tab 描述 */}
      <p className="text-sm text-gray-500 -mt-3">
        {activeTab === "items"
          ? "可配置功能：自动发货、发货配置、自动上架、自动回复规则绑定、AI回复、AI提示词"
          : "可配置功能：自动回复关键词规则，匹配买家消息并自动发送预设回复"}
      </p>

      {/* 商品管理 tab */}
      {activeTab === "items" && (
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* 搜索表单 */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-end gap-3 flex-wrap">
              {/* 账号下拉框 */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-gray-500 mb-1">账号</label>
                <select
                  value={searchInput.uid}
                  onChange={(e) => setSearchInput((prev) => ({ ...prev, uid: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="">全部账号</option>
                  {accountsData?.map((acc: AccountName) => (
                    <option key={acc.uid} value={acc.uid}>{acc.name}</option>
                  ))}
                </select>
              </div>
              {/* 商品ID */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-gray-500 mb-1">商品ID</label>
                <input
                  type="text"
                  value={searchInput.gid}
                  onChange={(e) => setSearchInput((prev) => ({ ...prev, gid: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="输入商品ID"
                />
              </div>
              {/* 商品标题 */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-gray-500 mb-1">商品标题</label>
                <input
                  type="text"
                  value={searchInput.title}
                  onChange={(e) => setSearchInput((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="输入商品标题"
                />
              </div>
              {/* 状态下拉框 */}
              <div className="w-32">
                <label className="block text-xs text-gray-500 mb-1">商品状态</label>
                <select
                  value={filters.status ?? ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="">全部</option>
                  <option value="0">在售</option>
                  <option value="-2">已下架</option>
                  <option value="1">已售出</option>
                </select>
              </div>
              {/* 刷新商品按钮 */}
              <RefreshButton
                uid={filters.uid}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["items"] })}
                onError={(msg) => addToast({ title: "刷新失败", description: msg, variant: "error" })}
              />
              {/* 清空按钮 */}
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md"
              >
                清空筛选
              </button>
            </div>
          </div>

          {/* 表格区域 */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-4">
              加载商品列表失败: {String(error)}
            </div>
          )}

          {!isLoading && !error && data && data.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center m-4">
              <h3 className="text-lg font-medium text-gray-900 mb-1">暂无商品</h3>
              <p className="text-sm text-gray-500">没有找到符合条件的商品</p>
            </div>
          )}

          {!isLoading && !error && data && data.length > 0 && (
            <div className="flex-1 overflow-auto" style={{ minHeight: "200px" }}>
              {/* 表头 - 固定 */}
              <div className="sticky top-0 z-10 grid gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-600" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
                <div className="col-span-2">
                  <button className="flex items-center gap-1 hover:text-blue-600" onClick={() => handleSort("title")}>
                    商品信息
                    <SortIcon field="title" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </div>
                <div className="col-span-1 text-right">
                  <button className="flex items-center gap-1 ml-auto hover:text-blue-600" onClick={() => handleSort("price")}>
                    价格
                    <SortIcon field="price" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </div>
                <div className="col-span-1 text-center">
                  <button className="flex items-center gap-1 mx-auto hover:text-blue-600" onClick={() => handleSort("publishTime")}>
                    发布时间
                    <SortIcon field="publishTime" sortField={sortField} sortDirection={sortDirection} />
                  </button>
                </div>
                <div className="col-span-1 text-center">数据</div>
                <div className="col-span-1 text-center">AI回复</div>
                <div className="col-span-1 text-center">自动发货</div>
                <div className="col-span-1 text-center">付款后发货</div>
                <div className="col-span-1 text-center">收货后赠送</div>
                <div className="col-span-1 text-center">评价后赠送</div>
                <div className="col-span-1 text-center">关键词回复</div>
                <div className="col-span-1 text-center">AI提示词</div>
                <div className="col-span-1 text-center">自动上架</div>
                <div className="col-span-1 text-center">指令码</div>
              </div>

              {/* 内容区域 */}
              {sortedItems.map((item, index) => (
                <ItemRow
                  key={item.gid}
                  item={item}
                  isEven={index % 2 === 0}
                  onToggle={handleToggle}
                  onEdit={() => setEditingItem(item)}
                  onKeywordClick={() => setKeywordItem(item)}
                  keywordCount={itemKeywordCounts[item.gid] || 0}
                  onUpdateField={(gid, field, value) => updateMutation.mutate({ gid, data: { [field]: value } })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 关键词规则 tab */}
      {activeTab === "rules" && (
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* 统计信息 */}
          <div className="grid grid-cols-5 gap-3 p-4 border-b border-gray-100">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{rulesStats.total}</div>
              <div className="text-xs text-gray-500">规则总数</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{rulesStats.enabled}</div>
              <div className="text-xs text-gray-500">已启用</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-600">{rulesStats.disabled}</div>
              <div className="text-xs text-gray-500">已禁用</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{rulesStats.linkedItems}</div>
              <div className="text-xs text-gray-500">关联商品</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{rulesStats.linkedGroups}</div>
              <div className="text-xs text-gray-500">关联商品组</div>
            </div>
          </div>

          {/* 操作栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="text-sm text-gray-500">
              {keywordsData?.rules.length === 0
                ? "暂无规则"
                : `共 ${keywordsData?.rules.length} 条规则，按优先级降序排列`}
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建规则
            </button>
          </div>

          {/* 规则列表 */}
          {keywordsLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {keywordsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-4">
              加载规则列表失败: {String(keywordsError)}
            </div>
          )}

          {!keywordsLoading && !keywordsError && keywordsData && keywordsData.rules.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">暂无规则</h3>
              <p className="text-sm text-gray-500 mb-4">点击上方"创建规则"按钮添加您的第一条关键词回复规则</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                创建规则
              </button>
            </div>
          )}

          {!keywordsLoading && !keywordsError && keywordsData && keywordsData.rules.length > 0 && (
            <RuleTable
              className="border-0 rounded-none shadow-none"
              rules={keywordsData.rules}
              onEdit={setEditingRule}
            />
          )}
        </div>
      )}

      {/* 编辑商品表单 */}
      {editingItem && (
        <ItemForm
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => setEditingItem(null)}
        />
      )}

      {/* 关键词回复配置 */}
      {keywordItem && (
        <ItemKeywordModal
          item={keywordItem}
          onClose={() => setKeywordItem(null)}
        />
      )}

      {/* 创建规则表单 */}
      {showCreateForm && (
        <RuleForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}

      {/* 编辑规则表单 */}
      {editingRule && (
        <RuleForm
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSuccess={() => setEditingRule(null)}
        />
      )}
    </div>
  )
}

type ConfigField = "deliveryContent" | "receiptAfter" | "positiveReviewAfter" | "ai_reply_item_prompt" | "sendCode"

interface ItemRowProps {
  item: Item
  isEven: boolean
  onToggle: (item: Item, field: "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock") => void
  onEdit: () => void
  onKeywordClick: () => void
  keywordCount: number
  onUpdateField: (gid: string, field: ConfigField, value: string) => void
}

const PLACEHOLDERS = [
  { label: "订单号", value: "{订单号}" },
  { label: "商品标题", value: "{商品标题}" },
  { label: "价格", value: "{价格}" },
  { label: "数量", value: "{数量}" },
  { label: "使用说明", value: "{使用说明}" },
  { label: "商家编码", value: "{商家编码}" },
  { label: "卡种/卡券方案名称", value: "{卡种/卡券方案名称}" },
  { label: "卡券信息", value: "{卡券信息}" },
  { label: "分段符", value: "{分段符}" },
  { label: "Sku属性名", value: "{Sku属性名}" },
  { label: "充值账号", value: "{充值账号}" },
  { label: "拍下时间", value: "{拍下时间}" },
  { label: "付款时间", value: "{付款时间}" },
  { label: "当前时间", value: "{当前时间}" },
  { label: "买家留言", value: "{买家留言}" },
]

// 配置模态框组件
function ConfigModal({
  item,
  field,
  value,
  onClose,
  onSave,
  onValueChange,
}: {
  item: Item
  field: ConfigField
  value: string
  onClose: () => void
  onSave: () => void
  onValueChange: (value: string) => void
}) {
  const [localValue, setLocalValue] = useState(value)

  const fieldLabels: Partial<Record<ConfigField, string>> = {
    deliveryContent: "付款后发货内容",
    receiptAfter: "收货后赠送内容",
    positiveReviewAfter: "评价后赠送内容",
    ai_reply_item_prompt: "AI系统提示词",
  }

  const handleDragStart = (e: React.DragEvent, placeholder: string) => {
    e.dataTransfer.setData("text/plain", placeholder)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const text = e.dataTransfer.getData("text/plain")
    if (text) {
      setLocalValue((prev) => prev + text)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* 标题栏 - 包含商品和账号信息 */}
        <div className="p-4 border-b">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{fieldLabels[field]}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* 商品和账号信息 */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-500">商品:</span>
              <span className="font-medium text-gray-900 truncate">{item.title || "无标题"}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>ID: {item.gid}</span>
              <span>账号: {item.account.name}</span>
              <span>价格: ¥{item.price}</span>
            </div>
          </div>
        </div>

        {/* 占位符区 */}
        <div className="px-4 pt-4">
          <div className="text-xs text-gray-500 mb-2">点击或拖拽占位符到文本框：</div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.value}
                draggable
                onDragStart={(e) => handleDragStart(e, p.value)}
                onClick={() => setLocalValue((prev) => prev + p.value)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 cursor-grab whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 文本输入区 */}
        <div className="p-4 flex-1 overflow-auto">
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
            placeholder="输入内容..."
          />
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 px-4 pb-4 border-t pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            取消
          </button>
          <button
            onClick={() => { onValueChange(localValue); onSave() }}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// 可点击的配置单元格
function ConfigCell({
  value,
  onClick,
}: {
  value: string
  onClick: () => void
}) {
  const hasValue = value && value.trim().length > 0
  return (
    <button
      onClick={onClick}
      className={`w-full h-full min-h-[2.5rem] max-h-[2.5rem] text-xs px-1 flex items-center justify-center text-center hover:underline ${
        hasValue ? "text-blue-600" : "text-gray-400"
      }`}
      title={value || "点击配置"}
    >
      {hasValue ? (
        <span className="text-center">闲鱼消息<br />无需物流发货</span>
      ) : (
        "未配置"
      )}
    </button>
  )
}

// 指令码原地编辑单元格
function SendCodeCell({
  gid,
  sendCode,
  onUpdateField,
}: {
  gid: string
  sendCode: string | null
  onUpdateField: (gid: string, field: "sendCode", value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleSave = () => {
    const trimmed = editValue.trim()
    const current = sendCode || ""
    if (trimmed !== current) {
      onUpdateField(gid, "sendCode", trimmed)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setEditing(false)
    }
  }

  const handleStartEdit = () => {
    setEditValue(sendCode || "")
    setEditing(true)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full text-center text-xs px-1 py-0.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    )
  }

  const hasValue = sendCode && sendCode.trim().length > 0
  return (
    <button
      onClick={handleStartEdit}
      className={`w-full text-xs text-center hover:underline ${hasValue ? "text-gray-700" : "text-gray-400"}`}
      title="此配置仅作为买家时生效"
    >
      {hasValue ? sendCode.trim() : "-"}
    </button>
  )
}

function ItemRow({ item, isEven, onToggle, onEdit, onKeywordClick, keywordCount, onUpdateField }: ItemRowProps) {
  const [configField, setConfigField] = useState<ConfigField | null>(null)

  return (
    <>
      <div
        className={`grid gap-2 px-4 py-2 items-center text-xs border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors ${
          isEven ? "bg-white" : "bg-gray-50/30"
        }`}
        style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
      >
        {/* 商品信息 */}
        <div className="col-span-2 min-w-0">
          <button
            onClick={onEdit}
            className="text-left hover:text-blue-600 hover:underline truncate block w-full"
            title={item.title || "无标题"}
          >
            {item.title || "无标题"}
          </button>
          <div className="flex items-center gap-1 mt-0.5 text-gray-400 truncate text-[11px]">
            <span title={item.gid} className="min-w-[85px]">{item.gid}</span>
            <span className="text-gray-300">|</span>
            <span title={item.account.uid} className="truncate">{item.account.name}</span>
          </div>
        </div>

        {/* 价格 */}
        <div className="col-span-1 text-right">
          <span className="text-orange-600 font-semibold">¥{item.price}</span>
        </div>

        {/* 发布时间 */}
        <div className="col-span-1 text-center text-[11px] text-gray-500">
          {formatPublishTime(item.publishTime)}
        </div>

        {/* 浏览/想要/收藏 */}
        <div className="col-span-1 text-center text-[11px] leading-tight">
          <div>{item.lookCount} / <span className="text-red-400">{item.wantCount}</span> / {item.collectCount}</div>
          <div className="text-gray-400">
            {item.collectCount > 0 ? (item.wantCount / item.collectCount).toFixed(1) : "-"}
          </div>
        </div>

        {/* 自动回复开关 
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => onToggle(item, "auto_reply")}
            className={`p-1.5 rounded transition-colors ${
              item.auto_reply ? "text-blue-500 bg-blue-50" : "text-gray-300 bg-gray-100"
            }`}
            title={item.auto_reply ? "自动回复：开" : "自动回复：关"}
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
        */}

        {/* AI回复开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => onToggle(item, "auto_ai_reply")}
            className={`p-1.5 rounded transition-colors ${
              item.auto_ai_reply ? "text-purple-500 bg-purple-50" : "text-gray-300 bg-gray-100"
            }`}
            title={item.auto_ai_reply ? "AI回复：开" : "AI回复：关"}
          >
            <Bot className="w-4 h-4" />
          </button>
        </div>

        {/* 自动发货开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => onToggle(item, "auto_delivery")}
            className={`p-1.5 rounded transition-colors ${
              item.auto_delivery ? "text-green-500 bg-green-50" : "text-gray-300 bg-gray-100"
            }`}
            title={item.auto_delivery ? "自动发货：开" : "自动发货：关"}
          >
            <Truck className="w-4 h-4" />
          </button>
        </div>

        {/* 付款后发货 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.deliveryContent}
            onClick={() => setConfigField("deliveryContent")}
          />
        </div>

        {/* 收货后 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.receiptAfter}
            onClick={() => setConfigField("receiptAfter")}
          />
        </div>

        {/* 评价后 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.positiveReviewAfter}
            onClick={() => setConfigField("positiveReviewAfter")}
          />
        </div>

        {/* 关键词回复 */}
        <div className="col-span-1 text-center">
          <button
            onClick={onKeywordClick}
            className={`text-xs hover:underline ${
              keywordCount > 0
                ? "text-orange-600"
                : "text-gray-400"
            }`}
            title="关键词回复"
          >
            {keywordCount > 0 ? `${keywordCount}条规则` : "未配置"}
          </button>
        </div>

        {/* AI提示词 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.ai_reply_item_prompt}
            onClick={() => setConfigField("ai_reply_item_prompt")}
          />
        </div>

        {/* 自动上架 */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => {
              if (item.account.isPro && !item.auto_restock) return
              onToggle(item, "auto_restock")
            }}
            disabled={item.account.isPro && !item.auto_restock}
            className={`p-1.5 rounded transition-colors ${
              item.auto_restock
                ? "text-teal-500 bg-teal-50"
                : item.account.isPro
                ? "text-gray-300 bg-gray-100 cursor-not-allowed"
                : "text-gray-300 bg-gray-100"
            }`}
            title={
              item.account.isPro && !item.auto_restock
                ? "Pro账号无法开启自动上架"
                : item.auto_restock
                ? "自动上架：开"
                : "自动上架：关"
            }
          >
             <Upload className="w-4 h-4" />
          </button>
        </div>

        {/* 指令码 */}
        <div className="col-span-1 text-center">
          <SendCodeCell
            gid={item.gid}
            sendCode={item.sendCode}
            onUpdateField={onUpdateField}
          />
        </div>
      </div>

      {/* 配置模态框 */}
      {configField && (
        <ConfigModal
          item={item}
          field={configField}
          value={item[configField] || ""}
          onClose={() => setConfigField(null)}
          onSave={() => setConfigField(null)}
          onValueChange={(value) => onUpdateField(item.gid, configField, value)}
        />
      )}
    </>
  )
}