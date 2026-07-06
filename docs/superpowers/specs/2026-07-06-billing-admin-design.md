# Billing 管理页面 — 设计文档

> 日期: 2026-07-06 | 状态: 已确认

## 一、背景

后端新增 billing 计费模块（`backend/free/admin/billing/`），包含会员方案配置、功能定价、风铃石定价、订单管理 4 个子域，需在管理后台开发对应页面进行管理。

## 二、路由 & 导航

| 项目 | 内容 |
|------|------|
| 路由 | `/admin/billing` |
| 页面文件 | `app/admin/billing/page.tsx` |
| 侧边栏 | AdminSidebar.tsx 新增 `{ label: '计费管理', path: '/admin/billing' }` |
| 图标 | 💰 Coin/DollarSign (lucide-react) |

## 三、整体架构

### 页面结构

单页 + TabBar（`variant="overline"`），4 个 Tab：

```
/admin/billing
├── TabBar (overline)
│   ├── 会员方案
│   ├── 功能定价
│   ├── 风铃石定价
│   └── 订单记录
└── 卡片容器 (rounded-xl border shadow-sm)
    └── 当前 Tab 内容
```

### 组件树

```
app/admin/billing/page.tsx                    ← 页面入口
├── TabBar (variant="overline")
├── MembershipPlanTab                          ← 会员方案
│   └── DataTable + EditableCell + 新增行
├── FeaturePricingTab                          ← 功能定价
│   └── DataTable + EditableCell + Switch + 新增行 + 删除
├── StonePricingTab                            ← 风铃石定价
│   └── DataTable + EditableCell + 新增行 + 删除
└── OrderHistoryTab                            ← 订单记录
    ├── 筛选栏(用户+状态+账号) + 类型切换(会员/风铃石)
    └── DataTable (只读) + Pagination
```

### 新增/修改的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/admin/billing/page.tsx` | 新建 | 页面入口，Tab 路由 |
| `app/admin/billing/MembershipPlanTab.tsx` | 新建 | 会员方案 Tab |
| `app/admin/billing/FeaturePricingTab.tsx` | 新建 | 功能定价 Tab |
| `app/admin/billing/StonePricingTab.tsx` | 新建 | 风铃石定价 Tab |
| `app/admin/billing/OrderHistoryTab.tsx` | 新建 | 订单记录 Tab |
| `components/ui/EditableCell.tsx` | 新建 | 通用行内编辑组件 |
| `lib/api/admin/billing.ts` | 新建 | Billing API 模块 |
| `lib/api/admin/index.ts` | 修改 | 追加 export + adminApi 条目 |
| `components/layout/AdminSidebar.tsx` | 修改 | 新增导航项 |

## 四、API 模块

### 文件：`lib/api/admin/billing.ts`

路由前缀：`/api/administrators/billing`

```ts
// ---- 类型 ----
export interface MembershipPlan {
  id: number; tier: number; max_accounts: number;
  price: number; daily_bonus: number;
  created_at: string; updated_at: string;
}
export interface FeaturePricing {
  id: number; feature: string; name: string;
  stones: number; is_active: boolean;
  created_at: string; updated_at: string;
}
export interface StoneSalePricing {
  id: number; price: number; amount: number;  // price=售价(分), amount=风铃石数
  created_at: string; updated_at: string;
}
export interface StoneOrder {
  order_id: string; status: string;
  amount_cents: number; amount_stones: number;
  old_stones: number; new_stones: number;
  user: { username: string; userId: string } | null;
  operator_user: { username: string; userId: string } | null;
  created_at: string; updated_at: string;
}
export interface MembershipOrder {
  id: number; order_id: string; status: string;
  amount_cents: number; amount_months: number;
  change_type: string;
  old_expires_at: string; new_expires_at: string;
  created_at: string; paid_at: string | null;
  user: { username: string; userId: string } | null;
  operator_user: { username: string; userId: string } | null;
  old_plan: { tier: number } | null;
  new_plan: { tier: number } | null;
}

// ---- 会员方案 ----
export async function getMembershipPlans(): Promise<MembershipPlan[]>
export async function createMembershipPlan(data: { tier: number; max_accounts: number; price: number; daily_bonus: number }): Promise<OperationResponse>
export async function updateMembershipPlan(id: number, data: Partial<MembershipPlan>): Promise<OperationResponse>

// ---- 功能定价 ----
export async function getFeaturePricingList(): Promise<FeaturePricing[]>
export async function createFeaturePricing(data: { feature: string; name: string; stones: number }): Promise<OperationResponse>
export async function updateFeaturePricing(id: number, data: Partial<FeaturePricing>): Promise<OperationResponse>
export async function deleteFeaturePricing(id: number): Promise<OperationResponse>

// ---- 风铃石定价 ----
export async function getStonePrices(): Promise<StoneSalePricing[]>
export async function createStonePrice(data: { price: number; amount: number }): Promise<OperationResponse>
export async function updateStonePrice(id: number, data: Partial<StoneSalePricing>): Promise<OperationResponse>
export async function deleteStonePrice(id: number): Promise<OperationResponse>

// ---- 订单 ----
export async function getMembershipOrders(page: number, pageSize: number, userId?: string, status?: string, account?: string): Promise<{ items: MembershipOrder[]; total: number }>
export async function getStoneOrders(page: number, pageSize: number, userId?: string, status?: string, account?: string): Promise<{ items: StoneOrder[]; total: number }>
```

> 所有端点均已由后端实现，无预留端点。

## 五、核心组件：EditableCell

### 路径：`components/ui/EditableCell.tsx`

通用行内编辑单元格，所有可编辑列共用。

### Props

```ts
interface EditableCellProps {
  value: string | number
  type?: 'text' | 'number'
  onSave: (newValue: string) => Promise<void>  // 调 API，失败则恢复原值
  disabled?: boolean
  className?: string
}
```

### 交互

| 操作 | 行为 |
|------|------|
| 点击静态值 | 进入编辑态，显示 `<input>` |
| 编辑中按 Enter | 调用 onSave → 成功后退出编辑，失败恢复原值 |
| 编辑中按 Esc | 恢复原值，退出编辑 |
| 编辑中点击外部（失焦） | 同 Enter，自动保存 |
| 保存中 | input disabled + 小 Spinner |
| disabled=true | 不可点击编辑（灰色文字） |

### 样式

- 静态态：正常文字，hover 时 cursor:pointer + 浅蓝底
- 编辑态：input 带 `ring-2 ring-blue-500`，与原单元格等宽

## 六、各 Tab 详细设计

### Tab 1: 会员方案

**布局层级**：

```
┌──────────────────────────────────────────────────┐
│  工具栏                                          │
│  [+ 新增方案]                                     │
├──────────────────────────────────────────────────┤
│  DataTable                                       │
│  （静态行 + 新增时顶部出现空行：tier <select> +      │
│   price/max_accounts/daily_bonus EditableCell）   │
└──────────────────────────────────────────────────┘
```

**DataTable 列**（grid 列宽按内容分配）：

| 列 | 字段 | 编辑方式 | 说明 |
|----|------|----------|------|
| 等级 | tier | 不可编辑（创建后锁） | Badge: Free灰色 / Basic蓝色 / Standard琥珀 / Pro紫色 |
| 月费(分) | price | EditableCell(number) | 展示用 fmtPrice 转元 |
| 最大店铺 | max_accounts | EditableCell(number) | |
| 每日风铃石 | daily_bonus | EditableCell(number) | |
| 创建时间 | created_at | 只读 | fmtDate |

**新增**：点击"+ 新增方案"→ 表格顶部出现空行，tier 列为 `<select>`（可选 Basic/Standard/Pro），其余为 EditableCell。

**约束**：tier 唯一（后端校验，前端 toast 提示）。

### Tab 2: 功能定价

**布局层级**：

```
┌──────────────────────────────────────────────────┐
│  工具栏                                          │
│  [+ 新增功能]                                     │
├──────────────────────────────────────────────────┤
│  DataTable                                       │
│  （每行：feature Select + name/stones EditableCell │
│   + is_active Switch + created_at + 🗑 按钮）      │
└──────────────────────────────────────────────────┘
```

**DataTable 列**：

| 列 | 字段 | 编辑方式 | 说明 |
|----|------|----------|------|
| 功能标识 | feature | 不可编辑（创建后锁） | 中文映射：order_change→订单变更, send_message→发送消息, auto_review→自动回复 |
| 名称 | name | EditableCell(text) | |
| 消耗风铃石 | stones | EditableCell(number) | |
| 启用 | is_active | Switch（即时切换） | 乐观更新，失败回滚 |
| 创建时间 | created_at | 只读 | |
| 删除 | — | 🗑 按钮 | 仅 is_active=false 时可删，否则 toast.warning 提示先停用 |

**新增**：feature 列为 `<select>`（可选所有 StoneConsumptionScene 枚举值）。

### Tab 3: 风铃石定价

**布局层级**：

```
┌──────────────────────────────────────────────────┐
│  工具栏                                          │
│  [+ 新增定价]                                     │
├──────────────────────────────────────────────────┤
│  DataTable                                       │
│  （每行：price/amount EditableCell + created_at    │
│   + 🗑 按钮 + ConfirmDialog）                     │
└──────────────────────────────────────────────────┘
```

**DataTable 列**：

| 列 | 字段 | 编辑方式 | 说明 |
|----|------|----------|------|
| 售价(分) | price | EditableCell(number) | 展示用 fmtPrice 转元 |
| 风铃石数 | amount | EditableCell(number) | |
| 创建时间 | created_at | 只读 | |
| 删除 | — | 🗑 按钮 | ConfirmDialog 确认 |

**API 函数**：`getStonePrices` / `createStonePrice` / `updateStonePrice` / `deleteStonePrice`。

### Tab 4: 订单记录

**布局层级**：

```
┌──────────────────────────────────────────────────┐
│  筛选栏（共享）                                    │
│  [userId 输入框]  [status 下拉]  [account 输入框]   │
├──────────────────────────────────────────────────┤
│  二级 pill 切换                                   │
│  [会员订单]  [风铃石订单]                           │
├──────────────────────────────────────────────────┤
│  DataTable                                       │
│  （列定义随选中类型切换：会员 11 列 / 风铃石 8 列）   │
├──────────────────────────────────────────────────┤
│  Pagination                                      │
└──────────────────────────────────────────────────┘
```

**交互规则**：
- 筛选栏 userId/status/account 两个订单类型共用，切换时保留筛选条件、重置 page=1
- 二级 pill 激活态 `bg-blue-50 text-blue-700 text-sm font-medium`，符合 frontend-tabs.md "细分不抢眼"原则
- DataTable 列定义和 `gridTemplateColumns` 随 pill 切换
- 分页组件共享，切换类型时重置到第 1 页

**会员订单 DataTable 列**（11 列，CSS Grid）：

| 列 | 字段 | 说明 |
|----|------|------|
| 订单ID | order_id | 等宽字体，截断（hover 完整） |
| 用户 | user.username | 嵌套 UserSimpleSchema |
| 变更类型 | change_type | StatusBadge: activate/upgrade蓝色/downgrade粉色/renew琥珀 |
| 旧方案 | old_plan.tier | 嵌套 MembershipPlanSchema |
| 新方案 | new_plan.tier | 嵌套 MembershipPlanSchema |
| 金额 | amount_cents | fmtPrice，0 时灰显 |
| 月数 | amount_months | 仅 renew 显示，否则 "—" |
| 状态 | status | StatusBadge: paid绿/pending琥珀/cancelled灰/expired灰 |
| 到期变更 | old→new_expires_at | 两行展示 |
| 操作人 | operator_user.username | system→"自动" |
| 时间 | created_at / paid_at | 两行展示 |

**风铃石订单 DataTable 列**（8 列，CSS Grid）：

| 列 | 字段 | 说明 |
|----|------|------|
| 订单ID | order_id | 等宽字体，截断（hover 完整） |
| 用户 | user.username | 嵌套 UserSimpleSchema |
| 金额 | amount_cents | fmtPrice |
| 风铃石数 | amount_stones | |
| 旧余额→新余额 | old_stones → new_stones | 两行展示 |
| 状态 | status | StatusBadge: paid绿/pending琥珀/cancelled灰/expired灰 |
| 操作人 | operator_user.username | system→"自动" |
| 时间 | created_at | fmtDateTime |

## 七、数据流 & 状态管理

### Tab 路由

使用 `useTabRouting` hook 管理 Tab 切换，同步到 URL query 参数：

```ts
const [tab, setTab] = useTabRouting(
  ['membership', 'features', 'stones', 'orders'],
  'membership'
)
```

### 数据状态管理

沿用现有 admin 页面模式（`useState` + `useCallback` + `useEffect`），保持一致性：

```ts
// 每个 Tab 内部独立管理状态
const [data, setData] = useState<T[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

const fetch = useCallback(async () => {
  setLoading(true); setError(null)
  try { const result = await apiCall(); setData(result) }
  catch (e) { setError(String(e)) }
  finally { setLoading(false) }
}, [])

useEffect(() => { fetch() }, [fetch])
```

### 乐观更新

- **Switch（is_active）**：点击即时切换 UI → 调 API → 失败则回滚
- **EditableCell**：await onSave → toast 反馈 → 成功保持新值/失败恢复原值
- **新增/删除**：await API → toast → 全量刷新列表

## 八、错误 & 边界处理

| 场景 | 处理 |
|------|------|
| 加载中 | DataTable 内置 LoadingSpinner |
| 加载失败 | DataTable 内置 ErrorBanner + onRetry |
| 空数据 | DataTable 内置 EmptyState + "新增"按钮 |
| 保存失败 | toast.error + EditableCell 恢复原值 |
| Switch 切换失败 | toast.error + 回滚 UI |
| 删除确认 | ConfirmDialog（替代 window.confirm） |
| 创建校验失败 | toast.error(后端返回的 detail) |

## 九、设计决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 页面组织 | 单页 + TabBar | 4 个子域属于同一业务模块，Tab 切换比独立路由更内聚 |
| 编辑方式 | 行内编辑（EditableCell） | 数据简单（大多为单数值），行内编辑比 SlidePanel 更高效，用户明确要求 |
| 确认/取消 | Enter/Esc/失焦（无按钮） | 用户要求，✓✗ 按钮显得违和 |
| 用户操作 | 放用户管理页 | 会员变更/充值需要用户上下文，billing 页专注配置管理 |
| 风铃石定价 CRUD | 直接对接 | 后端已补全 add/update/delete 端点 |
| 状态管理 | useState + useCallback | 与现有 admin 页面模式一致 |
| 表格组件 | DataTable | 项目已有统一组件，支持四态/排序/CSS Grid |
| 删除确认 | ConfirmDialog | 项目统一组件，替代 window.confirm |

## 十、不涉及的范围

- 用户管理页的会员操作/充值功能（独立需求，不在本次设计范围）
- ECharts 图表（billing 页面纯表格管理，无图表需求）
