# 组件设计规范

> 参考实现：`components/ui/` 目录下的共享组件

## 核心原则

### 1. 相同交互模式必须使用同一组件

项目中同一概念存在多种实现的问题必须消除。以下组件每个业务概念只能有**一个**实现：

| 组件 | 用途 | 当前问题 |
|------|------|----------|
| `EmptyState` | 空数据占位 | 5 种不同实现散落各处 |
| `ErrorBanner` | 错误提示横幅 | 3 种实现 |
| `LoadingState` | 加载中占位 | 部分用 `LoadingSpinner`，部分用纯文字 |
| `ConfirmDialog` | 二次确认弹窗 | 2 处仍用 `window.confirm`（`OpportunityLibrary.tsx`、`PublishInstanceList.tsx`） |
| `Pagination` | 分页控件 | admin 下 3 个页面各自重复实现 |
| `StatusBadge` | 状态标签 | 多处自定义颜色内联 |
| `PriorityPill` | 优先级/筛选 pill | 样式不统一 |
| `SearchToolbar` | 搜索栏 | 多处各自实现 |
| `DataTable` | 数据表格 | admin 页面各自封装 |
| `ConfigModal` | 配置弹窗 | `AccountTable.tsx` 和 `AccountCard.tsx` 各定义一遍 |
| `AIConfigFormFields` | AI 配置表单字段 | `AIConfigForm.tsx` 与 `AIConfigTab.tsx` 中重复 |

新建页面时必须从已有统一组件中选择，不得为同一交互模式再写新组件。

### 2. 组件 props 超过 5 个时考虑重构

当 props 超过 2 个时，应评估是否可以通过以下方式简化：

- 拆分组件 — 将多功能组件拆为多个职责单一的组件
- Context 提供共享数据 — 避免 props 层层传递

### 3. 组件文件超过 300 行时考虑拆分

| 文件 | 当前行数（估算） | 建议 |
|------|------------------|------|
| `ProductMonitorTab.tsx` | ~500+ | 拆分筛选栏 / 列表 / 图表 |
| `PublishInstanceList.tsx` | ~450+ | 拆分图片拖拽逻辑 / 列表 / 表单 |
| `KeywordRuleForm.tsx` | ~330+ | 拆分字段分组 |

### 4. 禁止内嵌组件定义

不得在组件函数体内定义另一个组件（函数组件或 class 组件）。允许的例外：

- 子组件 **< 30 行** 且**仅在该父组件内使用**
- 简单的渲染辅助函数（非组件）

```tsx
// ❌ 禁止
function ParentComponent() {
  function InnerModal({ data }: { data: T }) {
    return <div>{/* 50+ 行 JSX */}</div>
  }
  return <InnerModal data={x} />
}

// ✅ 允许（< 30 行且仅内部使用）
function ParentComponent() {
  function RowLabel({ text }: { text: string }) {
    return <span className="text-xs text-gray-500">{text}</span>
  }
  return <RowLabel text="foo" />
}
```

### 5. 禁止重复定义工具函数和常量

以下内容在项目中存在多处重复定义，必须统一到公共位置：

| 重复内容 | 出现位置 | 应统一到 |
|----------|----------|----------|
| `STATUS_MAP` | `ProductMonitorTab.tsx:225`、`ProductDiagnosticDrawer.tsx:81` | `components/selection/product/constants.ts` |
| `fmtPrice` | 3 个文件各自定义 | `lib/utils/format.ts` |
| `fmtGrowth` | 2 个文件各自定义 | `lib/utils/format.ts` |
| FAB 拖拽逻辑（~65 行） | `Sidebar.tsx:88`、`AdminSidebar.tsx:64` | `hooks/useFabDrag.ts` |
| `ConfigModal` | `AccountTable.tsx:45`、`AccountCard.tsx:18` | `components/accounts/ConfigModal.tsx` |

## 组件文件规范

### 文件命名

- **组件文件**使用 PascalCase：`EmptyState.tsx`、`StatusBadge.tsx`、`SearchToolbar.tsx`
- **非组件文件**使用 kebab-case：`chart-theme.ts`、`use-chart.ts`、`format.ts`
- `components/ui/` 下当前存在命名混用问题（`loading-spinner.tsx`、`qr-code-display.tsx` 等 kebab-case 组件文件），新组件统一用 PascalCase，已有文件逐步迁移

### 命名修正

| 当前文件名 | 问题 | 应修正为 |
|------------|------|----------|
| `RulesItemsingleDrawer.tsx` | 拼写错误（`Itemsingle` → `ItemSingle`） | `RuleItemSingleDrawer.tsx` |

### 导出方式

- **统一使用命名导出**：`export function ComponentName`
- **禁止 default export**。`components/ui/echart/` 下 2 个文件使用了 default export（`AccountPieChart.tsx`、`ImStatusChart.tsx`），需逐步改为命名导出
- 每个组件文件只导出一个主组件。子组件可以共存但不应被外部引用，如需外部引用则独立文件

```tsx
// ✅ 正确
export function EmptyState({ message }: { message: string }) { ... }

// ❌ 禁止
export default function EmptyState({ message }: { message: string }) { ... }
```

### 组件目录

```
components/
├── ui/                        ← 通用 UI 组件（跨业务共享）
│   ├── Tab/index.tsx           — TabBar 组件（支持 overline/inset 变体）
│   ├── Sheet.tsx               — 抽屉/底部弹出组件
│   ├── loading-spinner.tsx     — 加载动画
│   ├── toaster.tsx             — Toast 通知（Toaster + useToast）
│   ├── slide-panel.tsx         — 滑出面板
│   ├── qr-code-display.tsx     — 二维码展示
│   ├── proxy-item.tsx          — 代理项展示
│   ├── text-editor.tsx         — 文本编辑器
│   └── echart/
│       ├── useChart.ts         — ECharts 封装 hook
│       ├── AccountPieChart.tsx — 账号分布饼图
│       └── ImStatusChart.tsx   — IM 状态图表
├── accounts/                   ← 账号模块业务组件
├── auth/                       ← 认证模块业务组件
├── items/                      ← 商品模块业务组件
│   ├── views/                  — 视图组件（列表行、卡片等）
│   ├── drawers/                — 抽屉/弹窗组件
│   └── parts/                  — 表单/配置片段组件
├── layout/                     ← 布局组件
├── publish/                    ← 发布模块业务组件
├── selection/                  ← 选品模块业务组件
│   ├── product/                — 商品监控
│   ├── keyword/                — 关键词
│   └── merchant/               — 商家监控
├── settings/                   ← 设置模块业务组件
└── ai-config/                  ← AI 配置业务组件
```

## 需通过重构创建的共享组件

以下组件目前散落在业务代码中，应提取到 `components/ui/` 下统一实现：

| 组件 | 建议路径 | 说明 |
|------|----------|------|
| `EmptyState` | `components/ui/empty-state.tsx` | 统一空状态展示，props 包含 `icon`、`title`、`description`、`action` |
| `ErrorBanner` | `components/ui/error-banner.tsx` | 统一错误提示，支持 `variant: 'banner' \| 'inline'` |
| `ConfirmDialog` | `components/ui/confirm-dialog.tsx` | 统一二次确认弹窗，替代 `window.confirm` |
| `Pagination` | `components/ui/pagination.tsx` | 统一分页控件 |
| `StatusBadge` | `components/ui/status-badge.tsx` | 统一状态标签，通过配置表映射颜色 |
| `PriorityPill` | `components/ui/priority-pill.tsx` | 统一筛选 pill 样式，`variant: 'nav' \| 'action'` |
| `SearchToolbar` | `components/ui/search-toolbar.tsx` | 统一搜索栏（搜索框 + 筛选 + 操作按钮） |
| `DataTable` | `components/ui/data-table.tsx` | 通用数据表格封装 |
| `ConfigModal` | `components/accounts/config-modal.tsx` | 账号配置弹窗（提取自 AccountTable/AccountCard） |
| `AIConfigFormFields` | `components/ai-config/form-fields.tsx` | AI 配置表单字段（提取自 AIConfigForm/AIConfigTab） |

## 反模式

- 在多个文件中为同一概念写不同的组件
- 使用 `window.confirm` / `window.alert`（应用自定义 `ConfirmDialog`）
- 在组件中硬编码颜色值（应用 Tailwind token 或 CSS 变量）
- 使用 inline style 替代 Tailwind 类（动态尺寸除外，如 `style={{ width: panelWidth }}`）
- 在不同模块中各定义一遍相同的工具函数或常量映射
- 组件文件使用 default export
- 在组件函数体内定义另一个 > 30 行的子组件

## 另见

- [组件索引](../docs/COMPONENTS.md) — 项目所有可复用组件清单
- [PC/移动端布局铁律](frontend-layout.md) — 组件放置位置和容器规范
- [状态管理规范](frontend-state.md) — 组件 Props 过多时的状态提升方案
