# 用户管理页 — 会员操作 & 充值功能 设计文档

> 日期: 2026-07-08 | 状态: 已确认

## 一、背景

后端 billing 模块已实现 4 个管理员操作用户的端点（升级/降级/续费/充值），前端用户管理页（`/admin/users`）当前仅展示基本信息，缺少会员管理入口。本设计将操作入口集成到用户管理页的表格中。

## 二、改动范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `lib/api/admin/users.ts` | **修改** | 扩展 `AdminUserInfo` 增加 plan/stones 字段；新增 4 个操作 API |
| `app/admin/users/page.tsx` | **修改** | 表格增加 3 列（会员/风铃石/操作）；集成操作 Sheet + DropdownMenu |
| `app/admin/users/MembershipActionSheet.tsx` | **新建** | 升级/降级/续费/充值表单 Sheet |

不涉及新增路由，不修改侧边栏。

## 三、组件树

```
app/admin/users/page.tsx
├── 标题栏（不变）
├── 用户表格（扩展列）
│   ├── 用户名 (2fr)        ← 不变
│   ├── 联系方式 (2fr)       ← 不变
│   ├── 角色 (1fr)           ← 不变
│   ├── 状态 (1fr)           ← 不变
│   ├── 会员 (2fr)           ← 新增：等级 Badge + 到期时间
│   ├── 风铃石 (2fr)         ← 新增：stones + stones_bonus
│   ├── 店铺 (1fr)           ← 缩减
│   ├── 代理 (1fr)           ← 缩减
│   └── 操作 (1fr)           ← 新增：DropdownMenu
├── Pagination（不变）
├── ProxyManagePanel（不变）
└── MembershipActionSheet    ← 新增
```

## 四、API & 数据层

### 4.1 扩展 AdminUserInfo

`lib/api/admin/users.ts` — 后端 UserSchema 已返回以下字段，前端补接收：

```ts
/** 会员方案（后端直接返回 MembershipPlanSchema，字段完整直接使用） */
export interface MembershipPlanSimple {
  id: number | null
  tier: number | null
  max_accounts: number | null
  price: number | null
  daily_bonus: number | null
  created_at: string | null
  updated_at: string | null
}

export interface AdminUserInfo {
  // ... 现有字段不变
  plan: MembershipPlanSimple | null      // 当前会员方案（后端直接返回完整方案）
  plan_expires_at: string | null         // 到期时间
  stones: number | null                  // 风铃石充值余额
  stones_bonus: number | null            // 风铃石赠送余额
}
```

### 4.2 新增操作 API

请求前缀使用 billing 模块路由。放在同一文件 `lib/api/admin/users.ts`：

```ts
const M = '/api/administrators/billing/membership'
const S = '/api/administrators/billing/stones'

/** 升级会员 */
export async function upgradeMembership(data: {
  userId: string; tier: number; amount_cents?: number; remark?: string
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${M}/upgrade`, {
    method: 'POST', body: JSON.stringify(data),
  })
}

/** 降级会员 */
export async function downgradeMembership(data: {
  userId: string; tier: number; amount_cents?: number; remark?: string
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${M}/downgrade`, {
    method: 'POST', body: JSON.stringify(data),
  })
}

/** 续费会员 */
export async function renewMembership(data: {
  userId: string; duration_months: number; tier: number
  amount_cents: number; remark?: string
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${M}/renew`, {
    method: 'POST', body: JSON.stringify(data),
  })
}

/** 充值风铃石（后端仅支持 userId + amount 查询参数，不含 remark） */
export async function rechargeStones(
  userId: string, amount: number
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(
    `${S}/recharge?userId=${encodeURIComponent(userId)}&amount=${amount}`,
    { method: 'POST' },
  )
}
```

### 4.3 依赖的已有 API

操作表单的下拉选项来自 billing API（已实现）：

- `getMembershipPlans()` → 等级列表（id, tier, max_accounts, price, daily_bonus）
- `getStonePrices()` → 风铃石充值档位（amount, stones）

## 五、表格扩展

### 5.1 列定义

当前 `grid-cols-10` → 扩展为 13fr 精确控制（gridTemplateColumns）。新增 3 个语义列，店铺和代理各缩减 1fr。

### 5.2 会员列

上下两行紧凑展示。等级使用 StatusBadge 颜色映射：

| tier | 显示 | 颜色 |
|------|------|------|
| 0 | Free | 灰色 |
| 1 | Basic | 蓝色 |
| 2 | Standard | 琥珀色 |
| 3 | Pro | 紫色 |

到期时间使用 `fmtDate`，`plan_expires_at` 为 null 时显示 "—"。

### 5.3 风铃石列

```
充值  12,345     ← stones，灰色小字前缀 "充值"
赠送   1,000     ← stones_bonus，灰色小字前缀 "赠送"
```

数字 `tabular-nums`，行高 `leading-tight`。

### 5.4 操作列

每行末尾 `MoreHorizontal` 图标按钮（lucide-react），点击弹出 DropdownMenu。菜单项动态显示：

| 菜单项 | 图标 | 显示条件 | 隐藏条件 |
|--------|------|---------|---------|
| 升级会员 | `ArrowUp` | `plan.tier < 最高等级` | 已是最高等级 或 无计划列表 |
| 降级会员 | `ArrowDown` | `plan.tier > 0` | 已是 Free |
| 续费会员 | `RotateCw` | `plan.tier > 0` | 无会员等级 |
| 充值风铃石 | `Coins` | 始终显示 | — |

点击菜单项后打开 `MembershipActionSheet`。

## 六、MembershipActionSheet

### 6.1 Props

```ts
interface Props {
  open: boolean
  onClose: () => void
  action: 'upgrade' | 'downgrade' | 'renew' | 'recharge'
  user: AdminUserInfo
  onSuccess: () => void
}
```

### 6.2 内部逻辑

- `useEffect` 在 `open` 时加载 `getMembershipPlans()` 和 `getStonePrices()`
- 根据 `action` 渲染对应表单
- 升级/降级：过滤可选等级（升级只显示比当前高的，降级只显示比当前低的）
- 续费：自动使用 `user.plan.tier`，不显示等级选择器

### 6.3 各操作表单

**升级会员**：
- 当前等级：Badge 只读
- 目标等级：`<select>`，选项 = plans.filter(p => p.tier > user.plan.tier)
- 金额(分)：`<input type="number">`，默认 0
- 备注：`<input type="text">`，选填

**降级会员**：
- 当前等级：Badge 只读
- 目标等级：`<select>`，选项 = plans.filter(p => p.tier < user.plan.tier)
- 金额(分)：`<input type="number">`，默认 0
- 备注：`<input type="text">`，选填

**续费会员**：
- 当前等级：Badge 只读（自动带入请求）
- 续费月数：`<input type="number">`，min=1，必填
- 金额(分)：`<input type="number">`，必填
- 备注：`<input type="text">`，选填

**充值风铃石**：
- 当前风铃石：只读展示 `fmtNumber(stones)`
- 充值档位：`<select>`，选项来自 stonePrices，显示 "¥{fmtPrice(price/100)} = {stones} 风铃石"
- 备注：后端当前不支持 remark 参数，不提供此字段

### 6.4 交互状态

| 状态 | 行为 |
|------|------|
| 提交中 | 按钮 Spinner + "操作中..."，disabled |
| 成功 | toast.success → onSuccess() → onClose() |
| 失败 | toast.error(后端 detail) |
| 加载 plans/prices 失败 | toast.error，表单下拉为空，提交按钮 disabled |

### 6.5 布局

- 桌面端：`SlidePanel` 从右侧滑出，内部 `p-6 space-y-4`
- 移动端：自动降级 BottomSheet，`p-4 space-y-4`
- 表单控件：`h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg`

## 七、状态管理

沿用现有 admin 页面模式（`useState + useCallback + useEffect`），与 billing 页和 users 页一致：

- 操作成功后调用 `fetchUsers(page)` 全量刷新列表
- 操作 Sheet 内部管理自身表单状态和提交 loading
- 不引入 React Query mutation（与现有模式保持一致）

## 八、错误 & 边界处理

| 场景 | 处理 |
|------|------|
| 加载 plans/prices 失败 | toast.error + 表单下拉为空 |
| 操作提交失败 | toast.error(后端返回的 detail)，Sheet 保持打开允许重试 |
| 等级列表为空 | 所有会员操作菜单项隐藏 |
| 风铃石定价列表为空 | 充值菜单项 disabled + tooltip "暂无可选定价" |
| 已是最高等级 | 升级菜单项隐藏 |
| 已是 Free | 降级/续费菜单项隐藏 |
| 必填项为空 | 提交按钮 disabled |
| 目标等级=当前等级 | 升级/降级下拉自动过滤，不会出现（前端保障；后端也有校验兜底） |

## 九、设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 操作入口位置 | 表格行内 DropdownMenu | 每行独立操作，比顶部工具栏更直接 |
| 表单载体 | Sheet（已内置移动端降级） | 操作是临时性任务，Sheet 比 Modal 更轻量 |
| 操作成功后刷新 | 全量刷新列表 | 会员变更影响多列（等级/到期时间/风铃石），全量刷新确保一致性 |
| 金额单位 | 分（与后端一致） | 避免浮点精度问题，展示层通过 fmtPrice 转元 |
| API 放 users.ts | 与用户管理页同文件 | billing.ts 专注配置管理，用户操作 API 就近放在用户模块 |
| 状态管理 | useState + useCallback | 与现有 admin 页面模式一致 |

## 十、不涉及的范围

- billing 页面的修改（会员方案/功能定价/风铃石定价/订单记录 — 已完成）
- 用户管理页的筛选/排序增强（独立需求）
- 批量操作（独立需求）
- 操作历史/操作日志（独立需求）
