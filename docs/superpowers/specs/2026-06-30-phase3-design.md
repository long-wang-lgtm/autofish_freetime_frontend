# Phase 3 统一设计 — 分步实施文档

> 日期：2026-06-30 | 状态：待实施

## 概述

Phase 3 目标：统一页面设计、消除 Token 违规、补齐缺失的共享组件、修复关键功能缺口。

核心原则：**先打地基，优化结构，最后调整内容**。每步独立 commit，出错好回退。

## 前置决策

| 决策 | 结论 |
|------|------|
| 暗色主题（#26） | 推迟到 Phase 4 |
| Token 清理策略 | 按类别分步批量替换 |
| 整体方案 | 方案 A：地基→结构→Token→导出→内容 |
| Token 审查标准 | 零任意值——所有字号/颜色/间距走标准 Token |
| accounts 页定位 | 改为 Tab 页面，预留扩展 |

---

## 分步路径总览

```
地基组件（Step 1）
  ├── EmptyState     ← 替代 22+ 处内联空状态
  ├── ErrorBanner    ← 替代 8+ 处内联错误展示
  ├── ConfirmDialog  ← 替代 4 处 window.confirm
  └── StatusBadge    ← 替代 10+ 处内联状态映射
        ↓
结构统一（Step 2）
  ├── 页面容器修复（3 页）
  ├── 圆角统一 rounded-lg→rounded-xl（卡片级）
  ├── 分割线 gray-200→gray-100（卡片内部）
  └── 负 margin 消除（2 处）
        ↓
Token 批量替换（Step 3）
  ├── 3.1 非标准 padding→标准三档（p-3/p-4/p-6）
  ├── 3.2 font-bold→font-semibold
  ├── 3.3 text-[Npx]→标准字号 Token（xs/sm/base/lg）
  └── 3.4 硬编码颜色→Tailwind 语义色
        ↓
导出规范（Step 4）
  └── default export→命名导出（14 个组件文件）
        ↓
内容修复（Step 5）
  ├── #7  accounts 页加 TabBar（★☆☆）
  ├── #9  桌面端商品管理加统计概览（★★☆）
  ├── #10 选品列表层异常标记（★★★）
  └── #6  ProductMonitorTab 移动端焦点卡片（★★★★）
```

---

## Step 1：地基组件

> **导出方式**：所有 Step 1 新建组件必须使用命名导出 `export function`，禁止 default export。此约束在 Step 1 直接执行，不留给 Step 4。

### 1.1 EmptyState

**文件**：`components/ui/EmptyState.tsx`

```ts
// Props 接口
interface EmptyStateProps {
  icon?: React.ReactNode           // 默认空盒子 SVG
  title: string                    // "暂无商品"
  description?: string             // 引导文案
  action?: {
    label: string
    onClick: () => void
  }
  size?: 'sm' | 'md'               // sm=紧凑列表内, md=页面级
}

export function EmptyState({ icon, title, description, action, size }: EmptyStateProps)
```

**样式规格**：
- 容器：`rounded-xl border border-gray-200 shadow-sm`，md=`p-6`，sm=`p-4`
- 图标：默认 SVG 空盒子图标（灰色 48px），`text-gray-300`
- 标题：`text-sm font-medium text-gray-700`（sm）/ `text-base font-semibold text-gray-800`（md）
- 描述：`text-xs text-gray-400`（sm）/ `text-sm text-gray-500`（md）
- CTA 按钮：`h-10 px-4 rounded-lg bg-blue-600 text-white text-sm`

**替换范围**：22+ 处全部替换，优先替换高频页面（items/accounts/publish）。

### 1.1.1 替换清单

| 优先级 | 文件 | 当前实现 | 备注 |
|--------|------|---------|------|
| P0 | `components/items/ItemsTab.tsx` | 灰色卡片 + 文字无图标 | items 页面核心 |
| P0 | `components/items/RulesTab.tsx` | SVG + 标题 + 描述 + CTA | rules 页面核心 |
| P0 | `app/dashboard/accounts/page.tsx` | 图标 + 标题 + 描述 | accounts 核心 |
| P1 | `components/selection/product/ProductMonitorTab.tsx` | 纯文字 | 选品核心 |
| P1 | `components/publish/OpportunityLibrary.tsx` | 纯文字 | 发布核心 |
| P1 | `components/publish/PublishInstanceList.tsx` | 纯文字居中 | 发布核心 |
| P2 | `components/accounts/LinkManagement.tsx` | SVG + 标题 + 描述 + 虚线边框 | 账号模块 |
| P2 | `components/accounts/ReviewTemplateSheet.tsx` | 纯文字 | 账号模块 |
| P2 | `components/settings/AIConfigTab.tsx` | 标题 only | 设置模块 |
| P2 | `components/selection/keyword/KeywordCollectionTab.tsx` | 纯文字 | 选品模块 |
| P3 | `components/selection/product/CumulativeGrowthChart.tsx` | 纯文字居中 | 图表空状态 |
| P3 | `components/selection/product/IntentConversionChart.tsx` | 纯文字居中 | 图表空状态 |
| P3 | `components/selection/product/TrafficActionChart.tsx` | 纯文字居中 | 图表空状态 |
| P3 | `components/selection/product/TrendChart.tsx` | 纯文字 | 图表空状态 |
| P3 | `components/ui/echart/AccountPieChart.tsx` | 纯文字居中 | 图表空状态 |
| P3 | `app/admin/page.tsx` | 纯文字无图标 | admin 仪表盘 |
| P3 | `app/admin/accounts/page.tsx` | SVG + 标题 + 描述 | admin |
| P3 | `app/admin/users/page.tsx` | 图标 + 标题 + 描述 | admin |
| P3 | `app/admin/proxy/page.tsx` | Shield 图标 + 标题 + 描述 | admin |

替换顺序：P0 → P1 → P2 → P3，每级替换完 commit。替换后旧的内联空状态代码删除。

### 1.2 ErrorBanner

**文件**：`components/ui/ErrorBanner.tsx`

```ts
interface ErrorBannerProps {
  message: string
  variant: 'banner' | 'inline'
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorBanner({ message, variant, onRetry, onDismiss }: ErrorBannerProps)
```

**样式规格**：
- banner：`bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm`，全宽，带错误 SVG 图标 + 重试按钮
- inline：`bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600`，卡片内嵌，较小
- 关闭按钮：右上 `text-gray-500 hover:text-gray-700`，添加 `aria-label="关闭错误提示"`
- 重试按钮：`text-sm text-red-700 font-medium hover:text-red-800`

**区别于 ErrorBoundary**：ErrorBanner 用于展示**已被捕获的**业务/API 错误，不处理 React 渲染异常。React 渲染异常由 `ErrorBoundary`（Class Component）处理。

**替换范围**：8+ 处全部替换。

### 1.3 ConfirmDialog

**文件**：`components/ui/ConfirmDialog.tsx`

```ts
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string      // 默认"确认"
  cancelLabel?: string       // 默认"取消"
  variant?: 'danger' | 'default'
  loading?: boolean
  triggerRef?: React.RefObject<HTMLElement>  // 可选，用于显式指定焦点回归目标
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, loading, config }: ConfirmDialogProps)
```

**样式规格**：
- 遮罩：`fixed inset-0 bg-black/50 z-50`
- 弹窗：`bg-white rounded-xl shadow-lg p-6 max-w-sm mx-auto`
- 按钮：default 确认按钮 `bg-blue-600 text-white`，danger 确认按钮 `bg-red-600 text-white`
- 焦点管理：`role="dialog"` + `aria-modal="true"`，打开时保存 `document.activeElement` 引用，焦点移入弹窗容器（`tabIndex={-1}`）。关闭时焦点回到保存的触发元素
- Loading 状态：确认按钮显示 Spinner + 禁用

**替换范围**：4 处 window.confirm 全部替换。

### 1.3.1 迁移指南：window.confirm → ConfirmDialog

`window.confirm` 是同步的，ConfirmDialog 是异步的。迁移时需将业务逻辑从 `if` 块移入 `onConfirm` 回调。

**Before（同步）**：
```tsx
if (window.confirm('确认删除该商机？')) {
  deleteMutation.mutate(id)
}
```

**After（异步）**：
```tsx
<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="确认删除"
  description="确认删除该商机？删除后将无法恢复。"
  variant="danger"
  onConfirm={() => deleteMutation.mutate(id)}
/>

// 触发：onClick={() => setConfirmOpen(true)}
```

**高风险迁移点**：
- `PublishInstanceList.tsx:346` — 批量发布循环，需将 `forEach` + `publishMutation` 全部移入 `onConfirm`
- `OpportunityLibrary.tsx:38` — 删除确认需配合 `onConfirm` 获取当前选中项 ID

### 1.4 StatusBadge

**文件**：`components/ui/StatusBadge.tsx`

```ts
interface StatusBadgeProps {
  status: string | number
  config: Record<string | number, { label: string; color: ColorKey }>
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, config, size }: StatusBadgeProps)

type ColorKey = 'green' | 'red' | 'amber' | 'gray'
```

**样式规格**：
- 统一：`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium`
- 颜色映射（dot + 文字）：
  - green: dot `bg-green-500` + text `text-green-600 bg-green-50`
  - red: dot `bg-red-500` + text `text-red-600 bg-red-50`
  - amber: dot `bg-amber-500` + text `text-amber-600 bg-amber-50`
  - gray: dot `bg-gray-400` + text `text-gray-500 bg-gray-100`

Badge 文字使用 -600 色号（比规范深一级），以确保小面积浅底上有足够对比度。信息型状态统一使用灰色，不使用蓝色（遵循 frontend-colors.md 品牌色唯一原则）。

**替换范围**：各模块的状态标签逐步迁移。各业务模块保留自己的 config 对象（定义状态-key 到 label+color 的映射），但渲染统一走 StatusBadge。

---

## Step 2：结构统一

### 2.1 页面顶级容器

| 文件 | 修改 |
|------|------|
| `app/dashboard/accounts/page.tsx` | 改为 Tab 页面（见 #7），容器用 `flex flex-col gap-5 h-full` |
| `app/dashboard/items/page.tsx` | `space-y-5` → `gap-5`（已是 flex flex-col 结构） |
| `app/dashboard/settings/page.tsx` | `space-y-5` → `flex flex-col gap-5 h-full` |

### 2.2 圆角统一

**规则**：卡片容器（有 `border` + `shadow-sm` 的 div/section）用 `rounded-xl`。按钮/输入框/下拉等控件级元素保持 `rounded-lg`。

**操作**：逐个文件 grep `rounded-lg`，判断上下文。每个模块一个 commit。

### 2.3 分割线颜色

**规则**：卡片**内部**分割线（`border-b`/`border-t`）用 `border-gray-100`。卡片**自身**边框用 `border-gray-200`。

**操作**：grep `border-gray-200` + `border-b` 或 `border-t` 组合，卡片内部的分割线替换。

### 2.4 负 margin 消除

| 文件 | 行 | 当前 | 修复 |
|------|-----|------|------|
| `accounts/page.tsx` | 45 | `-mt-3` | 移除，调整上层 margin-bottom |
| `items/page.tsx` | 49 | `-mt-3` | 同上 |

---

## Step 3：Token 批量替换

### 3.1 非标准 padding → 标准三档

**唯一合法值**：`p-3`(12px)、`p-4`(16px)、`p-6`(24px)，以及对应的单向变体（`px-`、`py-`、`pt-`、`pb-`、`pl-`、`pr-`）。

**替换映射表**：

| 违规值 | 替换为 | 说明 |
|--------|--------|------|
| `p-2` | `p-3` | 紧凑卡片（12px 是最小标准） |
| `py-2.5` | `py-2` | 与 h-10 按钮保持一致 |
| `px-5` | `px-4` | 按钮水平内边距 |
| `py-1.5` | `py-1` 或 `py-2` | 下拉项用 py-1，tag 用 py-2 |
| `p-5` | `p-4` | 非标准值 |
| `p-8` | `p-6` | 空状态大卡 |

**注意事项**：
- `py-2`（8px）仅用于按钮内部配合 `h-10`，不用于卡片/区域级间距
- 卡片间距统一用 `p-3`/`p-4`/`p-6`，不保留任何 `py-2.5`/`px-5` 等半格值
- 替换后需要逐行检查：按钮 h-10 + py-2 = 40px 总高，正确

### 3.2 font-bold → font-semibold

**操作**：全局 grep `font-bold`，全部替换为 `font-semibold`。零例外。

**预估影响文件**：约 10 个（RulesTab、FilterBar、MobileRuleCard、VerticalTimeline、ProductDiagnosticDrawer、LinkManagement 等）。

### 3.3 text-[Npx] → 标准字号 Token

**唯一合法字号**：

| Token | Tailwind 类 | 像素 |
|-------|------------|------|
| caption | `text-xs` | 12px |
| body-sm | `text-sm` | 14px |
| body | `text-base` | 16px |
| heading-sm | `text-base font-semibold` | 16px |
| heading | `text-lg font-semibold` | 18px |

**替换映射表**：

| 任意值 | 替换为 |
|--------|--------|
| `text-[9px]` | `text-xs` |
| `text-[10px]` | `text-xs` |
| `text-[11px]` | `text-xs` |
| `text-[13px]` | `text-sm` |

**审查要点**：替换后实际视觉效果。9px→12px、10px→12px 会显著增大某些超紧凑标签。如确需 10px 级别的尺寸，标注为技术债并在代码注释中说明。

### 3.4 硬编码颜色 → Tailwind 语义色（先验证再决定）

**前置验证**：先 grep 以下全部模式，确认是否有残留。如前序 Phase 已清理干净，此步标记为「验证通过/无需操作」并跳过。

**操作**：grep `text-[#`、`bg-[#`、`border-[#`、`stroke-[#`、`fill-[#`、`ring-[#`、`shadow-[#`、`outline-[#`、`from-[#`、`to-[#`（渐变）、`divide-[#`、`placeholder:[#`、`caret-[#`，以及内联 `style=` 属性中的 `#` 六位十六进制色值。

**替换规则**：
- 所有硬编码颜色必须映射到 Tailwind 语义色类（`text-gray-500` 等）或 CSS 变量（`var(--primary)` 等）
- 图表颜色引用 `lib/constants/chart-theme.ts` 中的常量，但 DOM 元素不能直接写色值
- ECharts option 中的颜色是数据配置，不算硬编码

---

## Step 4：导出规范

### default export → 命名导出

**操作**：14 个组件文件 `export default function Xxx` → `export function Xxx`，同步更新所有 import 语句。

```ts
// 前
export default function EmptyState() {}
// 后
export function EmptyState() {}
```

```ts
// import 前
import EmptyState from '@/components/ui/empty-state'
// import 后
import { EmptyState } from '@/components/ui/empty-state'
```

**受影响文件清单**（14 个）：
- `components/layout/Sidebar.tsx`
- `components/layout/Header.tsx`
- `components/layout/AdminSidebar.tsx`
- `components/ui/echart/AccountPieChart.tsx`
- `components/ui/echart/ImStatusChart.tsx`
- `components/settings/AIConfigTab.tsx`
- `components/settings/NotificationTab.tsx`
- `components/ai-config/AIConfigForm.tsx`
- `components/accounts/LinkLoginModal.tsx`
- `components/accounts/QrLoginModal.tsx`
- `components/accounts/ReviewTemplateSheet.tsx`
- `components/accounts/LinkManagement.tsx`
- `components/items/drawers/RuleItemsAllDrawer.tsx`
- `components/items/parts/RuleBindingPanel.tsx`

**注意**：`app/` 下的 `page.tsx` 使用 Next.js 约定的 default export，不动。

---

## Step 5：内容修复

### 5.1 #7 — accounts 页 TabBar 合规验证（★☆☆）

accounts 页已有 TabBar（`variant="overline"`）。此步骤降级为验证合规：

- 确认 TabBar 在卡片容器**外部**
- 确认容器使用 `flex flex-col gap-5 h-full`
- 清理负 margin（`-mt-3` 已在 Step 2.4 处理）
- 确认预留扩展：为后续 Tab 留好 Tab 数组结构

### 5.2 #9 — 桌面端商品管理加统计概览（★★☆）

**目标**：桌面端 ItemsTab 顶部增加统计概览行，与移动端对等。

**实施**：
- 在 ItemsTab 顶部（筛选栏上方、Tab 下方）加统计卡片行
- 4 个统计卡片：在售数量、仓库数量、售出数量、自动发货开启数
- 复用移动端已有的数据源（React Query 同一 key）
- 卡片样式：`rounded-xl border border-gray-200 shadow-sm p-4`，横排 grid

### 5.3 #10 — 选品列表层异常标记（★★★）

**目标**：商品监控列表行内可见异常标记，不锁在详情抽屉中。

**实施**：
- 在 ProductMonitorTab 表格列中新增"异常"列
- 异常类型徽章：升温信号🔥、价格异常💰、库存异常📦
- 每行最多 2 个徽章，超出显示 "+N"
- 筛选栏添加异常筛选开关（胶囊 pill 形式），默认关闭
- 颜色：升温用 amber、价格异常用 red、库存异常用 blue

### 5.4 #6 — ProductMonitorTab 移动端焦点卡片（★★★★）

**目标**：移动端可用的商品监控视图。

**选择焦点卡片理由**：ProductMonitorTab 字段超过 10 列（columnDefs 定义 13+ 列），每条记录信息密度极高，不适合卡片替换或渐进式展开。焦点卡片一次展示一条完整记录，用户通过滑动逐条浏览。

**实施**：
- 创建 `ProductFocusCard` 组件（移动端焦点卡片）
- 一次展示一条完整记录，左右箭头切换，导航按钮 `min-w-[44px] min-h-[44px]`（WCAG 触控目标要求）
- 卡片字段从 columnDefs 提取核心业务字段
- 顶部显著展示异常标记（与 #10 关联）
- 页码指示器："3 / 15"
- 触摸滑动支持：实现方案：左右箭头按钮（满足触控尺寸）+ CSS scroll-snap 滑动增强
- 加载状态用 LoadingSpinner，空状态用 EmptyState

---

## 执行约束

- **每步独立 commit**：按 Step 1 → 2 → 3.1 → 3.2 → 3.3 → 3.4 → 4 → 5.1 → 5.2 → 5.3 → 5.4 的顺序，每完成一步立即 commit
- **不跨层混合**：地基组件没建完不开始结构统一，结构没修完不开始 Token 替换
- **子代理策略**：
  - Step 1（组件创建）：每个组件一个子代理并行编写
  - Step 2-4（批量替换）：逐文件由子代理分区执行
  - Step 5（内容修复）：每个 issue 一个子代理
- **零破坏**：每步完成后 `npm run build` 验证通过才进入下一步

## 验证方式

1. **每步提交后**：`npm run build` 无 error
2. **Step 1 后**：Storybook/手动检查新组件在各种 props 下的渲染
3. **Step 3 后**：视觉回归——逐页截图对比（accounts/items/publish/selection/settings + admin 四页）
4. **Step 5 后**：
   - 移动端模拟器（375px 宽）验证 accounts TabBar、ProductMonitorTab 焦点卡片
   - 桌面端验证商品统计概览、异常标记

## 不纳入 Phase 3 的内容

| 项目 | 原因 |
|------|------|
| 暗色主题（#26） | 推迟到 Phase 4 |
| PriorityPill / SearchToolbar / DataTable 共享组件 | 优先级低于地基四件套，且每个涉及大量业务耦合，Phase 4 处理 |
| ECharts 按需导入（#8） | 属于 Phase 4 性能优化 |
| 组件大文件拆分（>300 行） | 属于 Phase 4 重构 |
| 内嵌子组件提取（>30 行） | 属于 Phase 4 重构 |
| 发布页流水线进度（#11） | 属于 Phase 5 功能增强 |
