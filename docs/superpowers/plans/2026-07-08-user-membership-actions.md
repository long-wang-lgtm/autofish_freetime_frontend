# 用户管理页 — 会员操作 & 充值功能 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在用户管理页表格中新增会员等级/到期时间/风铃石余额信息列，并通过行内下拉菜单 + Sheet 表单实现管理员的会员操作（升级/降级/续费/充值）。

**Architecture:** 扩展 `lib/api/admin/users.ts` 的类型与 API → 注册导出 → 新建 `MembershipActionSheet` 表单组件 → 改 `page.tsx` 表格列 + 操作列 + 状态集成。3 文件改动，无新路由。

**Tech Stack:** Next.js + React + Tailwind CSS v3, lucide-react icons, SlidePanel, sonner toast

---

### Task 1: 扩展 API 类型 & 新增 4 个操作 API

**Files:**
- Modify: `lib/api/admin/users.ts`

> 说明：后端 UserSchema 已返回 `plan`、`plan_expires_at`、`stones`、`stones_bonus`，前端只需补接收类型。4 个操作端点路由前缀在 billing 模块下。

- [ ] **Step 1: 新增 `MembershipPlanSimple` 接口 + 扩展 `AdminUserInfo`**

在文件顶部 `import type { ProxyLong, UserSimple } from './types'` 之后、`AdminUserInfo` 之前插入：

```ts
/** 会员方案精简信息（后端 MembershipPlanSchema 直接返回，字段完整接收） */
export interface MembershipPlanSimple {
  id: number | null
  tier: number | null
  max_accounts: number | null
  price: number | null
  daily_bonus: number | null
  created_at: string | null
  updated_at: string | null
}
```

然后扩展 `AdminUserInfo`：

```ts
export interface AdminUserInfo {
  userId: string | null
  username: string | null
  phone: string | null
  email: string | null
  is_active: boolean | null
  last_login: string | null
  role: string | null
  created_at: string | null
  accountCount: number | null
  proxyCount: number | null
  /** 前端填充 — 用户已绑定的代理列表（侧边栏按需加载，表格不再使用） */
  user_proxies?: ProxyLong[]
  // ---- 会员相关（后端 UserSchema 已返回） ----
  plan: MembershipPlanSimple | null
  plan_expires_at: string | null
  stones: number | null
  stones_bonus: number | null
}
```

- [ ] **Step 2: 新增 billing 操作 API 的 URL 前缀常量**

在 `const PREFIX = '/api/administrators/user'` 之后追加：

```ts
// billing 模块操作端点（管理员操作会员/风铃石）
const BILLING_M = '/api/administrators/billing/membership'
const BILLING_S = '/api/administrators/billing/stones'
```

- [ ] **Step 3: 新增 4 个操作 API 函数**

在文件末尾 `unbindUserProxy` 之后追加：

```ts
// ===== 会员操作 API =====

/** 管理员升级会员等级 */
export async function upgradeMembership(data: {
  userId: string
  tier: number
  amount_cents?: number
  remark?: string
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${BILLING_M}/upgrade`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 管理员降级会员等级 */
export async function downgradeMembership(data: {
  userId: string
  tier: number
  amount_cents?: number
  remark?: string
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${BILLING_M}/downgrade`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 管理员续费会员 */
export async function renewMembership(data: {
  userId: string
  duration_months: number
  tier: number
  amount_cents: number
  remark?: string
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${BILLING_M}/renew`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 管理员充值风铃石（后端仅接受 userId + amount 查询参数） */
export async function rechargeStones(
  userId: string,
  amount: number,
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(
    `${BILLING_S}/recharge?userId=${encodeURIComponent(userId)}&amount=${amount}`,
    { method: 'POST' },
  )
}
```

- [ ] **Step 4: TypeScript 类型检查**

```bash
npx tsc --noEmit
```

预期：无类型错误（新增字段为可选，不影响已有引用）。

- [ ] **Step 5: Commit**

```bash
git add lib/api/admin/users.ts
git commit -m "feat: add MembershipPlanSimple type, extend AdminUserInfo with plan/stones fields, add 4 membership action APIs"
```

---

### Task 2: 注册新增导出

**Files:**
- Modify: `lib/api/admin/index.ts`

- [ ] **Step 1: 追加类型导出**

在 `export type { AdminUserInfo } from './users'` 行之后插入：

```ts
export type { MembershipPlanSimple } from './users'
```

- [ ] **Step 2: 追加 API 函数导出**

找到 `from './users'` 的导出块（文件后半部分），在已有 users 导出之后追加 4 个新函数：

```ts
export {
  getUserList,
  getUserProxies,
  getBindableProxies,
  bindUserProxy,
  unbindUserProxy,
  upgradeMembership,    // 新增
  downgradeMembership,  // 新增
  renewMembership,      // 新增
  rechargeStones,       // 新增
} from './users'
```

- [ ] **Step 3: 追加 adminApi 聚合对象条目**

在 `const adminApi` 对象的 users 条目之后追加：

```ts
  upgradeMembership: users.upgradeMembership,
  downgradeMembership: users.downgradeMembership,
  renewMembership: users.renewMembership,
  rechargeStones: users.rechargeStones,
```

- [ ] **Step 4: TypeScript 类型检查**

```bash
npx tsc --noEmit
```

预期：无类型错误。

- [ ] **Step 5: Commit**

```bash
git add lib/api/admin/index.ts
git commit -m "feat: register MembershipPlanSimple type and 4 membership action API exports"
```

---

### Task 3: 新建 MembershipActionSheet 表单组件

**Files:**
- Create: `app/admin/users/MembershipActionSheet.tsx`

- [ ] **Step 1: 创建组件文件**

写入 `app/admin/users/MembershipActionSheet.tsx`：

```tsx
"use client"

import { useState, useEffect } from "react"
import { SlidePanel } from "@/components/ui/slide-panel"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { toast } from "sonner"
import { adminApi, type AdminUserInfo, type MembershipPlanSimple } from "@/lib/api/admin"
import type { MembershipPlan, StoneSalePricing } from "@/lib/api/admin"

/* ===== 等级 Badge 映射 ===== */
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

/* ===== Props ===== */
interface Props {
  open: boolean
  onClose: () => void
  action: "upgrade" | "downgrade" | "renew" | "recharge"
  user: AdminUserInfo
  onSuccess: () => void
}

/* ===== 组件 ===== */
export function MembershipActionSheet({ open, onClose, action, user, onSuccess }: Props) {
  const currentTier = user.plan?.tier ?? 0

  // ---- 后台数据 ----
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [stonePrices, setStonePrices] = useState<StoneSalePricing[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // ---- 表单 ----
  const [targetTier, setTargetTier] = useState<number>(currentTier)
  const [amountCents, setAmountCents] = useState<number>(0)
  const [durationMonths, setDurationMonths] = useState<number>(1)
  const [stoneAmount, setStoneAmount] = useState<number>(0)
  const [remark, setRemark] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // ---- 加载 plans & prices ----
  useEffect(() => {
    if (open) {
      setDataLoading(true)
      Promise.all([adminApi.getMembershipPlans(), adminApi.getStonePrices()])
        .then(([p, s]) => {
          setPlans(p || [])
          setStonePrices(s || [])
        })
        .catch((e) => toast.error(`加载数据失败: ${e}`))
        .finally(() => setDataLoading(false))
    }
  }, [open])

  // ---- 重置表单 ----
  useEffect(() => {
    if (open) {
      setAmountCents(0)
      setDurationMonths(1)
      setStoneAmount(stonePrices[0]?.amount ?? 0)
      setRemark("")
      // 升级/降级：默认选第一个可选等级
      if (action === "upgrade") {
        const first = plans.filter((p) => p.tier > currentTier)[0]
        setTargetTier(first?.tier ?? currentTier)
      } else if (action === "downgrade") {
        const first = plans.filter((p) => p.tier < currentTier)[0]
        setTargetTier(first?.tier ?? currentTier)
      } else {
        setTargetTier(currentTier)
      }
    }
  }, [open, action, currentTier, plans, stonePrices])

  // ---- 标题 ----
  const titleMap: Record<string, string> = {
    upgrade: "升级会员",
    downgrade: "降级会员",
    renew: "续费会员",
    recharge: "充值风铃石",
  }
  const title = `${titleMap[action]} - ${user.username || user.userId}`

  // ---- 可选等级 ----
  const upgradablePlans = plans.filter((p) => p.tier > currentTier)
  const downgradablePlans = plans.filter((p) => p.tier < currentTier)

  // ---- 提交 ----
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (action === "upgrade") {
        await adminApi.upgradeMembership({
          userId: user.userId!,
          tier: targetTier,
          amount_cents: amountCents || undefined,
          remark: remark || undefined,
        })
      } else if (action === "downgrade") {
        await adminApi.downgradeMembership({
          userId: user.userId!,
          tier: targetTier,
          amount_cents: amountCents || undefined,
          remark: remark || undefined,
        })
      } else if (action === "renew") {
        await adminApi.renewMembership({
          userId: user.userId!,
          duration_months: durationMonths,
          tier: currentTier,
          amount_cents: amountCents,
          remark: remark || undefined,
        })
      } else if (action === "recharge") {
        await adminApi.rechargeStones(user.userId!, stoneAmount)
      }

      toast.success(titleMap[action] + "成功")
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(`${titleMap[action]}失败: ${err}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- 提交按钮可用性 ----
  const canSubmit = (() => {
    if (submitting) return false
    if (action === "upgrade" && targetTier <= currentTier) return false
    if (action === "downgrade" && targetTier >= currentTier) return false
    if (action === "renew" && (durationMonths < 1 || amountCents <= 0)) return false
    if (action === "recharge" && stoneAmount <= 0) return false
    return true
  })()

  // ---- 表单样式常量 ----
  const labelCls = "block text-sm font-medium text-gray-700 mb-1"
  const inputCls =
    "w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
  const badgeCls = (tier: number) =>
    `inline-block px-1.5 py-0.5 text-xs font-medium rounded-full ${TIER_COLORS[tier] ?? "text-gray-600 bg-gray-100"}`

  return (
    <SlidePanel open={open} onClose={onClose} title={title}>
      {dataLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {/* ---- 当前等级（所有操作共用） ---- */}
          {action !== "recharge" && (
            <div>
              <label className={labelCls}>当前等级</label>
              <span className={badgeCls(currentTier)}>
                {TIER_LABELS[currentTier] ?? `Tier ${currentTier}`}
              </span>
            </div>
          )}

          {/* ---- 升级：目标等级 ---- */}
          {action === "upgrade" && (
            <div>
              <label className={labelCls}>目标等级</label>
              <select
                className={inputCls}
                value={targetTier}
                onChange={(e) => setTargetTier(Number(e.target.value))}
                disabled={upgradablePlans.length === 0}
              >
                {upgradablePlans.length === 0 && (
                  <option value={currentTier}>无可升级等级</option>
                )}
                {upgradablePlans.map((p) => (
                  <option key={p.tier} value={p.tier}>
                    {TIER_LABELS[p.tier] ?? `Tier ${p.tier}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ---- 降级：目标等级 ---- */}
          {action === "downgrade" && (
            <div>
              <label className={labelCls}>目标等级</label>
              <select
                className={inputCls}
                value={targetTier}
                onChange={(e) => setTargetTier(Number(e.target.value))}
                disabled={downgradablePlans.length === 0}
              >
                {downgradablePlans.length === 0 && (
                  <option value={currentTier}>无可降级等级</option>
                )}
                {downgradablePlans.map((p) => (
                  <option key={p.tier} value={p.tier}>
                    {TIER_LABELS[p.tier] ?? `Tier ${p.tier}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ---- 升级/降级：金额(分) ---- */}
          {(action === "upgrade" || action === "downgrade") && (
            <div>
              <label className={labelCls}>金额(分)</label>
              <input
                type="number"
                className={inputCls}
                value={amountCents}
                onChange={(e) => setAmountCents(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-gray-400 mt-1">选填，默认 0（免费操作）</p>
            </div>
          )}

          {/* ---- 续费：月数 ---- */}
          {action === "renew" && (
            <>
              <div>
                <label className={labelCls}>续费月数</label>
                <input
                  type="number"
                  className={inputCls}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>金额(分) *</label>
                <input
                  type="number"
                  className={inputCls}
                  value={amountCents}
                  onChange={(e) => setAmountCents(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
            </>
          )}

          {/* ---- 充值：当前风铃石 + 档位 ---- */}
          {action === "recharge" && (
            <>
              <div>
                <label className={labelCls}>当前风铃石余额</label>
                <span className="text-sm text-gray-700 tabular-nums">
                  {(user.stones ?? 0).toLocaleString("zh-CN")}
                </span>
              </div>
              <div>
                <label className={labelCls}>充值档位</label>
                <select
                  className={inputCls}
                  value={stoneAmount}
                  onChange={(e) => setStoneAmount(Number(e.target.value))}
                  disabled={stonePrices.length === 0}
                >
                  {stonePrices.length === 0 && (
                    <option value={0}>暂无可选定价</option>
                  )}
                  {stonePrices.map((sp) => (
                    <option key={sp.id} value={sp.amount}>
                      {(sp.amount / 100).toFixed(2)} 元 = {sp.stones} 风铃石
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ---- 备注（非充值操作） ---- */}
          {action !== "recharge" && (
            <div>
              <label className={labelCls}>备注</label>
              <input
                type="text"
                className={inputCls}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="选填"
              />
            </div>
          )}

          {/* ---- 提交 ---- */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-10 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <LoadingSpinner size="sm" />}
            {submitting ? "操作中..." : titleMap[action]}
          </button>
        </div>
      )}
    </SlidePanel>
  )
}
```

- [ ] **Step 2: TypeScript 类型检查**

```bash
npx tsc --noEmit
```

预期：无类型错误。如果 `StoneSalePricing.id` 等字段报错，检查 billing API 类型导出是否正确。

- [ ] **Step 3: Commit**

```bash
git add app/admin/users/MembershipActionSheet.tsx
git commit -m "feat: add MembershipActionSheet for admin membership operations"
```

---

### Task 4: 扩展用户表格 — 新增列 + 操作菜单 + 集成 Sheet

**Files:**
- Modify: `app/admin/users/page.tsx`

- [ ] **Step 1: 更新 imports**

在文件顶部追加新的 import：

```tsx
import {
  ArrowUp,
  ArrowDown,
  RotateCw,
  Coins,
  MoreHorizontal,
} from "lucide-react"
import { fmtDate } from "@/lib/utils/format"
import { MembershipActionSheet } from "./MembershipActionSheet"
import type { MembershipPlan, StoneSalePricing } from "@/lib/api/admin"
```

最终 imports 变为：

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { adminApi, type AdminUserInfo, type ProxyLong } from "@/lib/api/admin"
import { isAdminRole } from '@/lib/constants/admin'
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { SlidePanel } from "@/components/ui/slide-panel"
import { ProxyItem } from "@/components/ui/proxy-item"
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
import { Pagination } from "@/components/ui/pagination"
import { fmtDate } from "@/lib/utils/format"
import { MembershipActionSheet } from "./MembershipActionSheet"
import type { MembershipPlan, StoneSalePricing } from "@/lib/api/admin"
```

- [ ] **Step 2: 新增辅助常量和函数（在 `PAGE_SIZE` 之后）**

```tsx
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
```

- [ ] **Step 3: 在主组件 `AdminUsersPage` 中新增 Sheet 状态**

在现有 `showPanel`/`selectedUserId`/`selectedUsername` 状态之后追加：

```tsx
  // ---- 会员操作 Sheet 状态 ----
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [actionType, setActionType] = useState<
    "upgrade" | "downgrade" | "renew" | "recharge"
  >("upgrade")
  const [actionUser, setActionUser] = useState<AdminUserInfo | null>(null)

  // ---- 下拉菜单状态 ----
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null)
```

- [ ] **Step 4: 新增打开 Sheet 的回调**

在 `openPanel` 函数之后追加：

```tsx
  const openActionSheet = (
    a: "upgrade" | "downgrade" | "renew" | "recharge",
    user: AdminUserInfo,
  ) => {
    setActionType(a)
    setActionUser(user)
    setActionSheetOpen(true)
  }
```

- [ ] **Step 5: 替换表格 header 行（`grid-cols-10` → 新的 grid）**

删除当前的 header 行：
```tsx
<div className="grid grid-cols-10 gap-2 px-4 py-3 bg-gray-100 border-b border-gray-100 text-sm font-medium text-gray-600">
  <div className="col-span-2">用户名</div>
  <div className="col-span-2">联系方式</div>
  <div className="col-span-1">角色</div>
  <div className="col-span-1">状态</div>
  <div className="col-span-2">店铺数</div>
  <div className="col-span-2">代理IP</div>
</div>
```

替换为（用 `style` 精确 grid）：

```tsx
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
  <div>操作</div>
</div>
```

- [ ] **Step 6: 替换表格行（每行用新的 grid + 新增列）**

删除 `{users.map(...)}` 内的整个行内容（`<div key={user.userId} className={...grid-cols-10...}>` ... `</div>`），替换为：

```tsx
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
      <div className="relative flex justify-center">
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
```

- [ ] **Step 7: 添加 toggleMenu 函数和 MembershipActionSheet**

在 `openActionSheet` 之后追加：

```tsx
  const toggleMenu = (userId: string) => {
    setOpenMenuUserId((prev) => (prev === userId ? null : userId))
  }
```

在 `{selectedUserId && (<ProxyManagePanel .../>)}` 之后追加：

```tsx
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
```

- [ ] **Step 8: TypeScript 类型检查**

```bash
npx tsc --noEmit
```

预期：无类型错误。

- [ ] **Step 9: 验证构建**

```bash
npx next build
```

预期：构建成功。

- [ ] **Step 10: Commit**

```bash
git add app/admin/users/page.tsx
git commit -m "feat: extend user table with membership/stones columns, action dropdown menu, and MembershipActionSheet integration"
```

---

### Task 5: 验证 & 收尾

- [ ] **Step 1: 全量 TypeScript 检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: 构建**

```bash
npx next build
```

- [ ] **Step 3: 自查清单**
  - [ ] 表格新增 3 列（会员/风铃石/操作）正常渲染
  - [ ] 操作菜单项根据用户等级正确显示/隐藏
  - [ ] 升级/降级/续费/充值表单字段正确
  - [ ] 提交后 `onSuccess` 触发列表刷新
  - [ ] 错误时 toast 提示
  - [ ] 移动端 SlidePanel 自动降级 BottomSheet
