# Billing 管理页面 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `/admin/billing` 计费管理页面，含 4 个 Tab（会员方案/功能定价/风铃石定价/订单记录）+ EditableCell 通用组件

**Architecture:** 单页 + TabBar(overline) + 4 个子 Tab 组件。配置类 Tab 使用 DataTable + EditableCell 行内编辑，订单 Tab 含筛选栏 + pill 类型切换 + 动态列 DataTable + Pagination。API 模块 `lib/api/admin/billing.ts` 集中管理所有 billing 接口。

**Tech Stack:** Next.js + React + Tailwind CSS v3 + TypeScript, DataTable/ConfirmDialog/StatusBadge 项目共享组件

**后端路由前缀:** `/api/administrators/billing`（membership/features/stones 三个子路由）

**后端响应格式 (PydanticListModel):** 列表接口返回 `{ root: T[] }`，前端类型按项目惯例直接映射为 `T[]`

---

## 文件结构总览

| 文件 | 操作 | 说明 |
|------|------|------|
| `lib/api/admin/billing.ts` | 新建 | 所有 billing API 类型 + 函数 |
| `lib/api/admin/index.ts` | 修改 | 追加 billing 导出 |
| `components/layout/AdminSidebar.tsx` | 修改 | 新增"计费管理"导航项 |
| `components/ui/EditableCell.tsx` | 新建 | 通用行内编辑单元格 |
| `app/admin/billing/page.tsx` | 新建 | 页面入口 + TabBar + Suspense |
| `app/admin/billing/MembershipPlanTab.tsx` | 新建 | 会员方案 Tab |
| `app/admin/billing/FeaturePricingTab.tsx` | 新建 | 功能定价 Tab |
| `app/admin/billing/StonePricingTab.tsx` | 新建 | 风铃石定价 Tab |
| `app/admin/billing/OrderHistoryTab.tsx` | 新建 | 订单记录 Tab |

---

### Task 1: 创建 Billing API 模块

**Files:**
- Create: `lib/api/admin/billing.ts`

- [ ] **Step 1: 创建 billing API 模块**

写入 `lib/api/admin/billing.ts`：

```ts
/**
 * 管理员 — 计费管理 API
 *
 * 路由前缀: /api/administrators/billing
 * 子路由: /membership, /features, /stones
 */
import { fetchApi, type OperationResponse } from '@/lib/utils/api'

// ===== 类型定义 =====

export interface MembershipPlan {
  id: number
  tier: number
  max_accounts: number
  price: number
  daily_bonus: number
  created_at: string
  updated_at: string
}

/** 注意：后端 FeaturePricingSchema 字段名为 description，但 create/update 请求体使用 name */
export interface FeaturePricing {
  id: number
  feature: string
  description: string
  stones: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoneSalePricing {
  id: number
  price: number
  amount: number
  created_at?: string
  updated_at?: string
}

export interface StoneOrder {
  order_id: string
  status: string
  amount_cents: number
  amount_stones: number
  old_stones: number
  new_stones: number
  user: { username: string; userId: string } | null
  operator_user: { username: string; userId: string } | null
  created_at: string
  updated_at: string
}

export interface MembershipOrder {
  id: number
  order_id: string
  status: string
  amount_cents: number
  amount_months: number
  change_type: string
  old_expires_at: string
  new_expires_at: string
  created_at: string
  paid_at: string | null
  updated_at: string
  user: { username: string; userId: string } | null
  operator_user: { username: string; userId: string } | null
  old_plan: { tier: number } | null
  new_plan: { tier: number } | null
}

// ===== URL 前缀 =====

const M = '/api/administrators/billing/membership'
const F = '/api/administrators/billing/features'
const S = '/api/administrators/billing/stones'

// ===== 会员方案 =====

/** 获取会员方案列表 */
export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  return fetchApi<MembershipPlan[]>(`${M}/list`)
}

/** 新增会员方案 */
export async function createMembershipPlan(data: {
  tier: number
  max_accounts: number
  price: number
  daily_bonus: number
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${M}/create`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新会员方案（需要 id） */
export async function updateMembershipPlan(
  id: number,
  data: Partial<Omit<MembershipPlan, 'id' | 'created_at' | 'updated_at'>>
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${M}/update`, {
    method: 'PUT',
    body: JSON.stringify({ id, ...data }),
  })
}

// ===== 功能定价 =====

/** 获取功能定价列表 */
export async function getFeaturePricingList(): Promise<FeaturePricing[]> {
  return fetchApi<FeaturePricing[]>(`${F}/list`)
}

/** 新增功能定价（请求体使用 name，后端存入 description） */
export async function createFeaturePricing(data: {
  feature: string
  name: string
  stones: number
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${F}/create`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新功能定价 */
export async function updateFeaturePricing(
  id: number,
  data: { name?: string; stones?: number; is_active?: boolean }
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${F}/update`, {
    method: 'PUT',
    body: JSON.stringify({ id, ...data }),
  })
}

/** 删除功能定价 */
export async function deleteFeaturePricing(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${F}/delete?id=${id}`, {
    method: 'DELETE',
  })
}

// ===== 风铃石定价 =====

/** 获取风铃石定价列表 */
export async function getStonePrices(): Promise<StoneSalePricing[]> {
  return fetchApi<StoneSalePricing[]>(`${S}/prices`)
}

/** 新增风铃石定价 */
export async function createStonePrice(data: {
  price: number
  amount: number
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${S}/add`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新风铃石定价 */
export async function updateStonePrice(
  id: number,
  data: { price?: number; amount?: number }
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${S}/prices.update`, {
    method: 'PUT',
    body: JSON.stringify({ id, ...data }),
  })
}

/** 删除风铃石定价（后端 DELETE 接收 body） */
export async function deleteStonePrice(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${S}/prices.delete`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
}

// ===== 订单记录 =====

/** 获取会员订单列表 */
export async function getMembershipOrders(
  page: number,
  pageSize: number,
  userId?: string,
): Promise<MembershipOrder[]> {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (userId) params.userId = userId
  return fetchApi<MembershipOrder[]>(`${M}/order.list`, { params })
}

/** 获取风铃石订单列表 */
export async function getStoneOrders(
  page: number,
  pageSize: number,
  userId?: string,
  status?: string,
  account?: string,
): Promise<StoneOrder[]> {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (userId) params.userId = userId
  if (status) params.status = status
  if (account) params.account = account
  return fetchApi<StoneOrder[]>(`${S}/order.list`, { params })
}
```

- [ ] **Step 2: 提交**

```bash
git add lib/api/admin/billing.ts
git commit -m "feat: add billing admin API module with types and endpoints"
```

---

### Task 2: 注册 API 导出 + 侧边栏导航

**Files:**
- Modify: `lib/api/admin/index.ts`
- Modify: `components/layout/AdminSidebar.tsx`

- [ ] **Step 1: 在 admin/index.ts 中导出 billing 模块**

在 `lib/api/admin/index.ts` 中：

1. 在类型导出区域末尾添加：
```ts
export type {
  MembershipPlan,
  FeaturePricing,
  StoneSalePricing,
  StoneOrder,
  MembershipOrder,
} from './billing'
```

2. 在 API 函数导出区域末尾添加：
```ts
export {
  getMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  getFeaturePricingList,
  createFeaturePricing,
  updateFeaturePricing,
  deleteFeaturePricing,
  getStonePrices,
  createStonePrice,
  updateStonePrice,
  deleteStonePrice,
  getMembershipOrders,
  getStoneOrders,
} from './billing'
```

3. 在聚合 API 对象末尾添加 billing 命名空间导入和条目：
```ts
import * as billing from './billing'

export const adminApi = {
  // ... 现有条目 ...

  // Billing
  getMembershipPlans: billing.getMembershipPlans,
  createMembershipPlan: billing.createMembershipPlan,
  updateMembershipPlan: billing.updateMembershipPlan,
  getFeaturePricingList: billing.getFeaturePricingList,
  createFeaturePricing: billing.createFeaturePricing,
  updateFeaturePricing: billing.updateFeaturePricing,
  deleteFeaturePricing: billing.deleteFeaturePricing,
  getStonePrices: billing.getStonePrices,
  createStonePrice: billing.createStonePrice,
  updateStonePrice: billing.updateStonePrice,
  deleteStonePrice: billing.deleteStonePrice,
  getMembershipOrders: billing.getMembershipOrders,
  getStoneOrders: billing.getStoneOrders,
}
```

- [ ] **Step 2: 在 AdminSidebar 中添加"计费管理"导航**

在 `components/layout/AdminSidebar.tsx` 的 `adminNavItems` 数组中，在"代理设置"之前添加：

```tsx
{
  label: '计费管理',
  path: '/admin/billing',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
},
```

- [ ] **Step 3: 提交**

```bash
git add lib/api/admin/index.ts components/layout/AdminSidebar.tsx
git commit -m "feat: register billing API exports and add sidebar navigation"
```

---

### Task 3: 创建 EditableCell 通用组件

**Files:**
- Create: `components/ui/EditableCell.tsx`

- [ ] **Step 1: 创建 EditableCell 组件**

写入 `components/ui/EditableCell.tsx`：

```tsx
'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

export interface EditableCellProps {
  value: string | number
  type?: 'text' | 'number'
  onSave: (newValue: string) => Promise<void>
  disabled?: boolean
  className?: string
}

export function EditableCell({
  value,
  type = 'text',
  onSave,
  disabled = false,
  className,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 外部 value 变更时同步 draft（非编辑态）
  useEffect(() => {
    if (!editing) {
      setDraft(String(value))
    }
  }, [value, editing])

  // 进入编辑态时 focus
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = useCallback(async () => {
    const trimmed = draft.trim()
    if (trimmed === String(value)) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(trimmed)
      setEditing(false)
    } catch {
      // 失败时恢复原值，不退出编辑态（让用户看到错误 toast 后手动 Esc）
      setDraft(String(value))
    } finally {
      setSaving(false)
    }
  }, [draft, value, onSave])

  const cancel = useCallback(() => {
    setDraft(String(value))
    setEditing(false)
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }

  if (disabled) {
    return (
      <span className={cn('text-gray-400 cursor-not-allowed', className)}>
        {value}
      </span>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        disabled={saving}
        className={cn(
          'w-full h-8 px-2 py-1 text-sm border border-blue-400 rounded',
          'ring-2 ring-blue-500 outline-none',
          'bg-white dark:bg-gray-800',
          saving && 'opacity-50 cursor-wait',
          className,
        )}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        'cursor-pointer inline-block min-w-[2rem] px-1 py-0.5 rounded',
        'hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors',
        'text-sm text-gray-700 dark:text-gray-300',
        className,
      )}
      title="点击编辑"
    >
      {value}
    </span>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add components/ui/EditableCell.tsx
git commit -m "feat: add EditableCell inline editing component"
```

---

### Task 4: 创建配置类 Tab 组件

**Files:**
- Create: `app/admin/billing/MembershipPlanTab.tsx`
- Create: `app/admin/billing/FeaturePricingTab.tsx`
- Create: `app/admin/billing/StonePricingTab.tsx`

- [ ] **Step 1: 创建 MembershipPlanTab**

写入 `app/admin/billing/MembershipPlanTab.tsx`：

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminApi, type MembershipPlan } from '@/lib/api/admin'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { EditableCell } from '@/components/ui/EditableCell'
import { toast } from 'sonner'
import { fmtPrice, fmtDate } from '@/lib/utils/format'
import { Plus } from 'lucide-react'

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Free', color: 'gray' },
  1: { label: 'Basic', color: 'blue' },
  2: { label: 'Standard', color: 'amber' },
  3: { label: 'Pro', color: 'purple' },
}

/** 将 price 分转元显示 */
function displayPrice(cents: number): string {
  const yuan = cents / 100
  // 若为整数则无小数
  return yuan % 1 === 0 ? `¥${yuan}` : `¥${yuan.toFixed(2)}`
}

export function MembershipPlanTab() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTier, setNewTier] = useState<number>(1)
  const [newPrice, setNewPrice] = useState('')
  const [newMaxAccounts, setNewMaxAccounts] = useState('')
  const [newDailyBonus, setNewDailyBonus] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getMembershipPlans()
      setPlans(data || [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleEdit = useCallback(
    async (id: number, field: string, value: string) => {
      const numVal = field === 'tier' ? Number(value) : Number(value)
      if (isNaN(numVal)) {
        toast.error('请输入有效数字')
        throw new Error('Invalid number')
      }
      await adminApi.updateMembershipPlan(id, { [field]: numVal })
      toast.success('已更新')
      setPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: numVal } : p)),
      )
    },
    [],
  )

  const handleAdd = async () => {
    const price = Number(newPrice)
    const maxAccounts = Number(newMaxAccounts)
    const dailyBonus = Number(newDailyBonus)
    if (isNaN(price) || isNaN(maxAccounts) || isNaN(dailyBonus)) {
      toast.error('请填写有效的数字')
      return
    }
    try {
      await adminApi.createMembershipPlan({
        tier: newTier,
        price,
        max_accounts: maxAccounts,
        daily_bonus: dailyBonus,
      })
      toast.success('方案已新增')
      setAdding(false)
      setNewPrice('')
      setNewMaxAccounts('')
      setNewDailyBonus('')
      fetch()
    } catch (e) {
      toast.error(`新增失败: ${e}`)
    }
  }

  const columns: DataTableColumn<MembershipPlan>[] = [
    {
      key: 'tier',
      header: '等级',
      render: (item) => {
        const info = TIER_LABELS[item.tier]
        const colorMap: Record<string, string> = {
          gray: 'bg-gray-100 text-gray-600',
          blue: 'bg-blue-50 text-blue-600',
          amber: 'bg-amber-50 text-amber-600',
          purple: 'bg-purple-50 text-purple-600',
        }
        return (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${info ? colorMap[info.color] : ''}`}
          >
            {info?.label ?? item.tier}
          </span>
        )
      },
    },
    {
      key: 'price',
      header: '月费',
      render: (item) => (
        <EditableCell
          value={item.price}
          type="number"
          onSave={(v) => handleEdit(item.id, 'price', v)}
        />
      ),
    },
    {
      key: 'max_accounts',
      header: '最大店铺',
      render: (item) => (
        <EditableCell
          value={item.max_accounts}
          type="number"
          onSave={(v) => handleEdit(item.id, 'max_accounts', v)}
        />
      ),
    },
    {
      key: 'daily_bonus',
      header: '每日风铃石',
      render: (item) => (
        <EditableCell
          value={item.daily_bonus}
          type="number"
          onSave={(v) => handleEdit(item.id, 'daily_bonus', v)}
        />
      ),
    },
    {
      key: 'created_at',
      header: '创建时间',
      render: (item) => (
        <span className="text-gray-500 text-xs">{fmtDate(item.created_at)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">会员方案</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1 h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增方案
        </button>
      </div>

      {/* 新增行 */}
      {adding && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <select
            value={newTier}
            onChange={(e) => setNewTier(Number(e.target.value))}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <option value={1}>Basic</option>
            <option value={2}>Standard</option>
            <option value={3}>Pro</option>
          </select>
          <input
            type="number"
            placeholder="月费(分)"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-28"
          />
          <input
            type="number"
            placeholder="最大店铺"
            value={newMaxAccounts}
            onChange={(e) => setNewMaxAccounts(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-28"
          />
          <input
            type="number"
            placeholder="每日风铃石"
            value={newDailyBonus}
            onChange={(e) => setNewDailyBonus(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-28"
          />
          <button
            onClick={handleAdd}
            className="h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            确认
          </button>
          <button
            onClick={() => setAdding(false)}
            className="h-10 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      )}

      {/* DataTable */}
      <DataTable<MembershipPlan>
        columns={columns}
        data={plans}
        keyExtractor={(item) => String(item.id)}
        gridTemplateColumns="120px 1fr 1fr 1fr 140px"
        isLoading={loading}
        error={error}
        errorMessage={error ? `加载失败: ${error}` : undefined}
        onRetry={fetch}
        emptyTitle="暂无会员方案"
        emptyDescription="点击「新增方案」创建第一个会员等级"
        emptyAction={{ label: '新增方案', onClick: () => setAdding(true) }}
      />
    </div>
  )
}
```

- [ ] **Step 2: 创建 FeaturePricingTab**

写入 `app/admin/billing/FeaturePricingTab.tsx`：

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminApi, type FeaturePricing } from '@/lib/api/admin'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { EditableCell } from '@/components/ui/EditableCell'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import { fmtDate } from '@/lib/utils/format'
import { Plus, Trash2 } from 'lucide-react'

/** StoneConsumptionScene 枚举中文映射 */
const FEATURE_LABELS: Record<string, string> = {
  order_change: '订单变更',
  send_message: '发送消息',
  auto_review: '自动回复',
}

const FEATURE_OPTIONS = Object.entries(FEATURE_LABELS)

export function FeaturePricingTab() {
  const [items, setItems] = useState<FeaturePricing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newFeature, setNewFeature] = useState('order_change')
  const [newName, setNewName] = useState('')
  const [newStones, setNewStones] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getFeaturePricingList()
      setItems(data || [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleEdit = useCallback(
    async (id: number, field: string, value: string) => {
      const body: Record<string, unknown> = {}
      if (field === 'stones') {
        const n = Number(value)
        if (isNaN(n)) { toast.error('请输入有效数字'); throw new Error('Invalid') }
        body.stones = n
      } else if (field === 'description') {
        body.name = value
      }
      await adminApi.updateFeaturePricing(id, body)
      toast.success('已更新')
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...(field === 'description' ? { description: value } : field === 'stones' ? { stones: Number(value) } : {}) }
            : item,
        ),
      )
    },
    [],
  )

  const handleToggleActive = useCallback(async (item: FeaturePricing) => {
    const newActive = !item.is_active
    // 乐观更新
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_active: newActive } : i)),
    )
    try {
      await adminApi.updateFeaturePricing(item.id, { is_active: newActive })
    } catch (e) {
      // 回滚
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: item.is_active } : i)),
      )
      toast.error(`切换失败: ${e}`)
    }
  }, [])

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error('请输入名称'); return }
    const stones = Number(newStones)
    if (isNaN(stones)) { toast.error('请输入有效数字'); return }
    try {
      await adminApi.createFeaturePricing({
        feature: newFeature,
        name: newName.trim(),
        stones,
      })
      toast.success('功能已新增')
      setAdding(false)
      setNewName('')
      setNewStones('')
      fetch()
    } catch (e) {
      toast.error(`新增失败: ${e}`)
    }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await adminApi.deleteFeaturePricing(deleteId)
      toast.success('已删除')
      setItems((prev) => prev.filter((i) => i.id !== deleteId))
    } catch (e) {
      toast.error(`删除失败: ${e}`)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const columns: DataTableColumn<FeaturePricing>[] = [
    {
      key: 'feature',
      header: '功能标识',
      render: (item) => (
        <span className="text-xs font-medium text-gray-600">
          {FEATURE_LABELS[item.feature] ?? item.feature}
        </span>
      ),
    },
    {
      key: 'description',
      header: '名称',
      render: (item) => (
        <EditableCell
          value={item.description || ''}
          type="text"
          onSave={(v) => handleEdit(item.id, 'description', v)}
        />
      ),
    },
    {
      key: 'stones',
      header: '消耗风铃石',
      render: (item) => (
        <EditableCell
          value={item.stones}
          type="number"
          onSave={(v) => handleEdit(item.id, 'stones', v)}
        />
      ),
    },
    {
      key: 'is_active',
      header: '启用',
      render: (item) => (
        <button
          role="switch"
          aria-checked={item.is_active}
          onClick={() => handleToggleActive(item)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            item.is_active
              ? 'bg-blue-600'
              : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
              item.is_active ? 'translate-x-[18px]' : 'translate-x-[4px]'
            }`}
          />
        </button>
      ),
    },
    {
      key: 'created_at',
      header: '创建时间',
      render: (item) => (
        <span className="text-gray-500 text-xs">{fmtDate(item.created_at)}</span>
      ),
    },
    {
      key: 'delete',
      header: '',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => {
            if (item.is_active) {
              toast.warning('请先停用再删除')
              return
            }
            setDeleteId(item.id)
          }}
          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">功能定价</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1 h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增功能
        </button>
      </div>

      {adding && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <select
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            {FEATURE_OPTIONS.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-36"
          />
          <input
            type="number"
            placeholder="消耗风铃石"
            value={newStones}
            onChange={(e) => setNewStones(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-32"
          />
          <button
            onClick={handleAdd}
            className="h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            确认
          </button>
          <button
            onClick={() => setAdding(false)}
            className="h-10 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      )}

      <DataTable<FeaturePricing>
        columns={columns}
        data={items}
        keyExtractor={(item) => String(item.id)}
        gridTemplateColumns="120px 1fr 120px 60px 120px 48px"
        isLoading={loading}
        error={error}
        errorMessage={error ? `加载失败: ${error}` : undefined}
        onRetry={fetch}
        emptyTitle="暂无功能定价"
        emptyDescription="点击「新增功能」创建第一条功能定价"
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="确认删除"
        description="删除后无法恢复，确认删除该功能定价？"
        confirmLabel="删除"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
```

- [ ] **Step 3: 创建 StonePricingTab**

写入 `app/admin/billing/StonePricingTab.tsx`：

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminApi, type StoneSalePricing } from '@/lib/api/admin'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { EditableCell } from '@/components/ui/EditableCell'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import { fmtPrice, fmtDate } from '@/lib/utils/format'
import { Plus, Trash2 } from 'lucide-react'

export function StonePricingTab() {
  const [items, setItems] = useState<StoneSalePricing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getStonePrices()
      setItems(data || [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleEdit = useCallback(
    async (id: number, field: string, value: string) => {
      const n = Number(value)
      if (isNaN(n)) { toast.error('请输入有效数字'); throw new Error('Invalid') }
      await adminApi.updateStonePrice(id, { [field]: n })
      toast.success('已更新')
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: n } : item)),
      )
    },
    [],
  )

  const handleAdd = async () => {
    const price = Number(newPrice)
    const amount = Number(newAmount)
    if (isNaN(price) || isNaN(amount)) {
      toast.error('请填写有效的数字')
      return
    }
    try {
      await adminApi.createStonePrice({ price, amount })
      toast.success('定价已新增')
      setAdding(false)
      setNewPrice('')
      setNewAmount('')
      fetch()
    } catch (e) {
      toast.error(`新增失败: ${e}`)
    }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await adminApi.deleteStonePrice(deleteId)
      toast.success('已删除')
      setItems((prev) => prev.filter((i) => i.id !== deleteId))
    } catch (e) {
      toast.error(`删除失败: ${e}`)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const columns: DataTableColumn<StoneSalePricing>[] = [
    {
      key: 'price',
      header: '售价',
      render: (item) => (
        <EditableCell
          value={item.price}
          type="number"
          onSave={(v) => handleEdit(item.id, 'price', v)}
        />
      ),
    },
    {
      key: 'amount',
      header: '风铃石数',
      render: (item) => (
        <EditableCell
          value={item.amount}
          type="number"
          onSave={(v) => handleEdit(item.id, 'amount', v)}
        />
      ),
    },
    {
      key: 'created_at',
      header: '创建时间',
      render: (item) => (
        <span className="text-gray-500 text-xs">
          {item.created_at ? fmtDate(item.created_at) : '-'}
        </span>
      ),
    },
    {
      key: 'delete',
      header: '',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => setDeleteId(item.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">风铃石定价</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1 h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增定价
        </button>
      </div>

      {adding && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <input
            type="number"
            placeholder="售价(分)"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-32"
          />
          <input
            type="number"
            placeholder="风铃石数"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-32"
          />
          <button
            onClick={handleAdd}
            className="h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            确认
          </button>
          <button
            onClick={() => setAdding(false)}
            className="h-10 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      )}

      <DataTable<StoneSalePricing>
        columns={columns}
        data={items}
        keyExtractor={(item) => String(item.id)}
        gridTemplateColumns="1fr 1fr 140px 48px"
        isLoading={loading}
        error={error}
        errorMessage={error ? `加载失败: ${error}` : undefined}
        onRetry={fetch}
        emptyTitle="暂无风铃石定价"
        emptyDescription="点击「新增定价」创建第一条定价"
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="确认删除"
        description="删除后无法恢复，确认删除该定价？"
        confirmLabel="删除"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
```

- [ ] **Step 4: 提交**

```bash
git add app/admin/billing/MembershipPlanTab.tsx app/admin/billing/FeaturePricingTab.tsx app/admin/billing/StonePricingTab.tsx
git commit -m "feat: add billing config tabs (membership plan, feature pricing, stone pricing)"
```

---

### Task 5: 创建 OrderHistoryTab 组件

**Files:**
- Create: `app/admin/billing/OrderHistoryTab.tsx`

- [ ] **Step 1: 创建 OrderHistoryTab**

写入 `app/admin/billing/OrderHistoryTab.tsx`：

```tsx
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
import { toast } from 'sonner'
import { fmtPrice, fmtDate, fmtDateTime } from '@/lib/utils/format'
import { Search } from 'lucide-react'

const PAGE_SIZE = 20

type OrderType = 'membership' | 'stone'

// ===== 状态映射 =====

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: 'green' | 'amber' | 'gray' }> = {
  paid: { label: '已支付', color: 'green' },
  pending: { label: '待支付', color: 'amber' },
  cancelled: { label: '已取消', color: 'gray' },
  expired: { label: '已过期', color: 'gray' },
}

const CHANGE_TYPE_CONFIG: Record<string, { label: string; color: 'blue' | 'amber' | 'gray' }> = {
  activate: { label: '激活', color: 'blue' },
  upgrade: { label: '升级', color: 'blue' },
  downgrade: { label: '降级', color: 'amber' },
  renew: { label: '续费', color: 'amber' },
}

// 为 StatusBadge 兼容，扩展 color 类型
type BadgeColor = 'green' | 'red' | 'amber' | 'gray'

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
        list.length === PAGE_SIZE ? (p + 1) * PAGE_SIZE : (p - 1) * PAGE_SIZE + list.length,
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
        list.length === PAGE_SIZE ? (p + 1) * PAGE_SIZE : (p - 1) * PAGE_SIZE + list.length,
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
        <span className="font-mono text-xs text-gray-600 truncate block max-w-[120px]" title={item.order_id}>
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
        <span className={item.amount_cents === 0 ? 'text-gray-400' : 'text-gray-700'}>
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
          <div className="text-gray-400">{item.old_expires_at ? fmtDate(item.old_expires_at) : '-'}</div>
          <div className="text-gray-600">→ {item.new_expires_at ? fmtDate(item.new_expires_at) : '-'}</div>
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
        <span className="font-mono text-xs text-gray-600 truncate block max-w-[120px]" title={item.order_id}>
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
        <span className="text-gray-500 text-xs">{fmtDateTime(item.created_at)}</span>
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
        {([
          ['membership', '会员订单'],
          ['stone', '风铃石订单'],
        ] as const).map(([key, label]) => (
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
        columns={isMember ? memberColumns : stoneColumns}
        data={isMember ? memberOrders : stoneOrders}
        keyExtractor={(item) => item.order_id}
        gridTemplateColumns={
          isMember
            ? '120px 80px 60px 48px 48px 64px 36px 56px 100px 56px 100px'
            : '120px 80px 64px 72px 100px 56px 56px 120px'
        }
        isLoading={isMember ? memberLoading : stoneLoading}
        error={isMember ? memberError : stoneError}
        errorMessage={isMember ? `加载失败: ${memberError}` : `加载失败: ${stoneError}`}
        onRetry={() => isMember ? fetchMemberOrders(memberPage) : fetchStoneOrders(stonePage)}
        emptyTitle="暂无订单记录"
        emptyDescription="当前筛选条件下没有订单"
        rowClassName="text-xs"
      />

      {/* Pagination */}
      {((isMember ? memberOrders.length : stoneOrders.length) > 0) && (
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
```

- [ ] **Step 2: 提交**

```bash
git add app/admin/billing/OrderHistoryTab.tsx
git commit -m "feat: add order history tab with filter bar and type switcher"
```

---

### Task 6: 创建 Billing 页面入口

**Files:**
- Create: `app/admin/billing/page.tsx`

- [ ] **Step 1: 创建页面入口**

写入 `app/admin/billing/page.tsx`：

```tsx
'use client'

import { Suspense } from 'react'
import { TabBar } from '@/components/ui/Tab'
import { useTabRouting } from '@/hooks/useTabRouting'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Coins } from 'lucide-react'
import { MembershipPlanTab } from './MembershipPlanTab'
import { FeaturePricingTab } from './FeaturePricingTab'
import { StonePricingTab } from './StonePricingTab'
import { OrderHistoryTab } from './OrderHistoryTab'

const TABS = [
  { key: 'membership', label: '会员方案' },
  { key: 'features', label: '功能定价' },
  { key: 'stones', label: '风铃石定价' },
  { key: 'orders', label: '订单记录' },
] as const

function BillingPageContent() {
  const [tab, setTab] = useTabRouting(
    ['membership', 'features', 'stones', 'orders'] as const,
    'membership',
  )

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 标题栏 */}
      <div className="flex items-center gap-2">
        <Coins className="w-5 h-5 text-blue-600" />
        <h1 className="text-lg font-semibold text-gray-900">计费管理</h1>
      </div>

      {/* TabBar */}
      <TabBar
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        variant="overline"
      />

      {/* 内容卡片 */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-4 lg:p-6">
        {tab === 'membership' && <MembershipPlanTab />}
        {tab === 'features' && <FeaturePricingTab />}
        {tab === 'stones' && <StonePricingTab />}
        {tab === 'orders' && <OrderHistoryTab />}
      </div>
    </div>
  )
}

export default function AdminBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add app/admin/billing/page.tsx
git commit -m "feat: add billing admin page with TabBar and 4 tabs"
```

---

### Task 7: 类型检查 + 构建验证

- [ ] **Step 1: TypeScript 类型检查**

```bash
npx tsc --noEmit
```
Expected: 0 errors. If there are type errors, fix them before proceeding.

- [ ] **Step 2: Next.js 构建**

```bash
npx next build
```
Expected: Successful build with no errors.

- [ ] **Step 3: 修复问题（如有）并最终提交**

```bash
git add -A
git commit -m "fix: type and build fixes for billing admin page"
```

---

## 自检清单

1. **Spec 覆盖**：
   - ✅ API 模块（Task 1）
   - ✅ 侧边栏导航（Task 2）
   - ✅ EditableCell 组件（Task 3）
   - ✅ 会员方案 Tab（Task 4.1）
   - ✅ 功能定价 Tab（Task 4.2）
   - ✅ 风铃石定价 Tab（Task 4.3）
   - ✅ 订单记录 Tab（Task 5）
   - ✅ 页面入口 + TabBar（Task 6）

2. **无占位符**：所有步骤包含完整代码

3. **类型一致性**：
   - `MembershipPlan.id: number` — 所有引用一致
   - `FeaturePricing.description: string` — 后端 Schema 字段名
   - `StoneSalePricing.price/amount` — 后端 Schema 字段名
   - `adminApi.xxx()` 方法名 — 与 `admin/index.ts` 聚合对象一致
   - `useTabRouting` 类型参数 — 与 TabBar tabs 一致

4. **后端 API 路径已验证**：
   - `GET /api/administrators/billing/membership/list`
   - `POST /api/administrators/billing/membership/create`
   - `PUT /api/administrators/billing/membership/update`
   - `GET /api/administrators/billing/features/list`
   - `POST /api/administrators/billing/features/create`
   - `PUT /api/administrators/billing/features/update`
   - `DELETE /api/administrators/billing/features/delete?id=`
   - `GET /api/administrators/billing/stones/prices`
   - `POST /api/administrators/billing/stones/add`
   - `PUT /api/administrators/billing/stones/prices.update`
   - `DELETE /api/administrators/billing/stones/prices.delete`
   - `GET /api/administrators/billing/membership/order.list`
   - `GET /api/administrators/billing/stones/order.list`
