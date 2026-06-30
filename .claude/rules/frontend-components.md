# 组件设计规范

> 参考实现：`components/ui/` 目录下的共享组件

## 核心原则

### 1. 相同交互模式必须使用同一组件

项目中同一概念只能有**一个**实现。以下业务概念已约定统一组件：

| 组件 | 用途 |
|------|------|
| `EmptyState` | 空数据占位 |
| `ErrorBanner` | 错误提示横幅 |
| `LoadingState` | 加载中占位（统一使用 `LoadingSpinner`） |
| `ConfirmDialog` | 二次确认弹窗（替代 `window.confirm`） |
| `Pagination` | 分页控件 |
| `StatusBadge` | 状态标签，通过配置表映射颜色 |
| `PriorityPill` | 筛选 pill，`variant: 'nav' | 'action'` |
| `SearchToolbar` | 搜索栏（搜索框 + 筛选 + 操作按钮） |
| `DataTable` | 通用数据表格封装 |
| `ConfigModal` | 账号配置弹窗 |
| `AIConfigFormFields` | AI 配置表单字段 |

新建页面时必须从已有统一组件中选择，不得为同一交互模式再写新组件。

### 2. 组件 props 超过 2 个时考虑重构

当 props 超过 2 个时，应评估是否可以通过以下方式简化：

- 拆分组件 — 将多功能组件拆为多个职责单一的组件
- Context 提供共享数据 — 避免 props 层层传递

### 3. 组件文件超过 300 行时考虑拆分

当组件文件超过 300 行时，应评估拆分为多个子组件或提取逻辑到独立 hook。

### 4. 禁止内嵌组件定义

不得在组件函数体内定义另一个组件（函数组件或 class 组件）。允许的例外：

- 子组件 **< 30 行** 且**仅在该父组件内使用**
- 简单的渲染辅助函数（非组件）

### 5. 禁止重复定义工具函数和常量

以下内容必须统一到公共位置，禁止在各模块中重复定义：

| 重复内容 | 应统一到 | 状态 |
|----------|----------|------|
| `STATUS_MAP` | `components/selection/product/constants.ts` | 已完成 |
| `fmtPrice` / `fmtGrowth` 等格式化函数 | `lib/utils/format.ts` | 已完成 |
| FAB 拖拽逻辑 | `hooks/useFabDrag.ts` | 已完成 |
| `ConfigModal` | `components/accounts/ConfigModal.tsx` | 已完成 |
| `Pagination` | `components/ui/pagination.tsx` | 已完成 |

## 组件文件规范

### 文件命名

- **组件文件**使用 PascalCase：`EmptyState.tsx`、`StatusBadge.tsx`、`SearchToolbar.tsx`
- **非组件文件**使用 kebab-case：`chart-theme.ts`、`use-chart.ts`、`format.ts`
- 新组件统一用 PascalCase，已有 kebab-case 命名的组件文件逐步迁移

### 导出方式

- **统一使用命名导出**：`export function ComponentName`
- **禁止 default export**。已有 default export 的组件文件需逐步改为命名导出
- 每个组件文件只导出一个主组件。子组件可以共存但不应被外部引用，如需外部引用则独立文件

### 组件目录

```
components/
├── ui/                        ← 通用 UI 组件（跨业务共享）
│   ├── Tab/index.tsx           — TabBar 组件
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

## 需创建的共享组件

以下统一组件尚未创建，应提取到 `components/ui/` 下：

| 组件 | 建议路径 | 说明 |
|------|----------|------|
| `EmptyState` | `components/ui/empty-state.tsx` | 统一空状态展示 |
| `ErrorBanner` | `components/ui/error-banner.tsx` | 统一错误提示，支持 `variant: 'banner' | 'inline'` |
| `ConfirmDialog` | `components/ui/confirm-dialog.tsx` | 统一二次确认弹窗，替代 `window.confirm` |
| `StatusBadge` | `components/ui/status-badge.tsx` | 统一状态标签，通过配置表映射颜色 |
| `PriorityPill` | `components/ui/priority-pill.tsx` | 统一筛选 pill 样式 |
| `SearchToolbar` | `components/ui/search-toolbar.tsx` | 统一搜索栏（搜索框 + 筛选 + 操作按钮） |
| `DataTable` | `components/ui/data-table.tsx` | 通用数据表格封装 |

## 反模式

- 在多个文件中为同一概念写不同的组件
- 使用 `window.confirm` / `window.alert`（应用自定义 `ConfirmDialog`）
- 在组件中硬编码颜色值（应用 Tailwind token 或 CSS 变量）
- 使用 inline style 替代 Tailwind 类（动态尺寸除外）
- 在不同模块中各定义一遍相同的工具函数或常量映射
- 组件文件使用 default export
- 在组件函数体内定义另一个 > 30 行的子组件

## 另见

- [组件索引](../docs/COMPONENTS.md) — 项目所有可复用组件清单
- [PC/移动端布局铁律](frontend-layout.md) — 组件放置位置和容器规范
- [状态管理规范](frontend-state.md) — 组件 Props 过多时的状态提升方案
