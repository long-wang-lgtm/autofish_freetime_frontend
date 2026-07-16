# 组件索引

> 列出项目中所有可复用组件及其用途。新建功能前应先查阅此索引，避免重复造轮子。

## 布局组件 (`components/layout/`)

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `Sidebar` | `layout/Sidebar.tsx` | 用户端侧边栏，含 5 个导航项、可折叠、移动端 FAB 拖拽 | — |
| `Header` | `layout/Header.tsx` | 用户端顶栏，含品牌标识、管理员入口、用户下拉菜单 | `children?: ReactNode` |
| `AdminSidebar` | `layout/AdminSidebar.tsx` | 管理端侧边栏，含管理导航项、可折叠、FAB 拖拽 | — |

## 通用 UI 组件 (`components/ui/`)

### overlay/ — 浮层组件

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `Modal` | `ui/overlay/Modal.tsx` | 居中弹窗外壳，阻断式，遮罩不关闭 | `open`, `onClose`, `title?`, `size?`, `children`, `footer?` |
| `ConfirmDialog` | `ui/overlay/ConfirmDialog.tsx` | 统一确认弹窗，替代 window.confirm | `open`, `onOpenChange`, `title`, `description`, `onConfirm`, `variant?` |
| `Sheet` | `ui/overlay/Sheet.tsx` | 抽屉/底部弹出容器，支持手势拖拽关闭 | `open`, `onClose`, `title?`, `subtitle?`, `width?`, `children` |

### feedback/ — 反馈组件

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `EmptyState` | `ui/feedback/EmptyState.tsx` | 统一空状态展示，替代所有内联空状态 | `icon?`, `title`, `description?`, `action?`, `size?` |
| `ErrorBanner` | `ui/feedback/ErrorBanner.tsx` | 统一错误提示横幅，banner/inline 变体 | `message`, `variant`, `onRetry?`, `onDismiss?` |
| `ErrorBoundary` | `ui/feedback/ErrorBoundary.tsx` | React 渲染异常捕获（Class Component） | `children`, `fallback?` |
| `LoadingSpinner` | `ui/feedback/LoadingSpinner.tsx` | 加载动画指示器 | `size?: 'sm' \| 'md' \| 'lg'` |
| `StatusBadge` | `ui/feedback/StatusBadge.tsx` | 统一状态标签，配置驱动色映射 | `status`, `config`, `size?` |

### data/ — 数据展示组件

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `DataTable` | `ui/data/DataTable.tsx` | 列驱动 CSS Grid 表格，封装四态+排序+斑马纹+sticky表头 | `columns`, `data`, `gridTemplateColumns`, `stickyHeader?`, `orderBy?`, `asc?` |
| `EditableCell` | `ui/data/EditableCell.tsx` | 可编辑表格单元格 | `value`, `type?`, `onSave`, `disabled?` |
| `Pagination` | `ui/data/Pagination.tsx` | 统一分页控件 | `page`, `total`, `pageSize`, `onChange` |
| `SearchToolbar` | `ui/data/SearchToolbar.tsx` | 筛选栏统一布局壳，children 自由组合 | `children`, `className?` |

### navigation/ — 导航组件

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `TabBar` | `ui/navigation/TabBar/index.tsx` | 核心 Tab 组件，overline 样式，响应式三档 | `tabs`, `activeTab`, `onTabChange` |

### chart/ — 图表组件

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `useChart` | `ui/chart/useChart.ts` | ECharts 实例生命周期管理 hook | — |
| `ImStatusChart` | `ui/chart/ImStatusChart.tsx` | IM 状态实时折线图（消费 SSE 数据） | `snapshots` |
| `AccountPieChart` | `ui/chart/AccountPieChart.tsx` | 账号分布环形饼图 | `data` |

### 独立组件（根级）

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `useToast` / `Toaster` | `ui/Toaster.tsx` | Toast 通知系统（封装 sonner） | — |
| `TextEditor` | `ui/TextEditor.tsx` | 文本编辑器（响应式行数、maxHeight） | `value`, `onChange`, `rows?`, `maxHeight?` |

## 认证组件 (`components/auth/`)

| 组件 | 文件 | 用途 |
|------|------|------|
| `AuthProvider` | `auth/AuthProvider.tsx` | 认证初始化，挂载时调用 checkAuth |
| `LoginForm` | `auth/LoginForm.tsx` | 登录表单（react-hook-form + Zod） |
| `RegisterForm` | `auth/RegisterForm.tsx` | 注册表单（react-hook-form + Zod） |

## 账号管理组件 (`components/accounts/`)

| 组件 | 文件 | 用途 |
|------|------|------|
| `AccountTable` | `accounts/AccountTable.tsx` | 桌面端账号列表（含内嵌 ConfigModal、AccountRow） |
| `AccountCard` | `accounts/AccountCard.tsx` | 移动端账号卡片（紧凑三行布局，含内嵌 ConfigModal） |
| `QrLoginModal` | `accounts/QrLoginModal.tsx` | 扫码登录弹窗（使用 useQrLogin） |
| `LinkLoginModal` | `accounts/LinkLoginModal.tsx` | 链接登录弹窗（生成分享链接） |
| `LinkManagement` | `accounts/LinkManagement.tsx` | 链接管理面板（增删查） |
| `ReviewTemplateSheet` | `accounts/ReviewTemplateSheet.tsx` | 评价模板编辑 Sheet |

## 商品管理组件 (`components/items/`)

### 顶层
| 组件 | 文件 | 用途 |
|------|------|------|
| `ItemsTab` | `items/ItemsTab.tsx` | 商品管理 Tab 内容（DataTable 驱动桌面表格，移动端卡片切换，含统计概览+表头排序） |
| `RulesTab` | `items/RulesTab.tsx` | 回复规则 Tab 内容（含统计卡片） |
| `ItemsFilterBar` | `items/ItemsFilterBar.tsx` | 筛选栏入口（桌面/移动端自适应分发） |

### 视图 (`items/views/`)
| 组件 | 文件 | 用途 |
|------|------|------|
| `ItemRow` | `items/views/ItemRow.tsx` | 桌面端商品行（13 列） |
| `MobileProductCard` | `items/views/MobileProductCard.tsx` | 移动端商品卡片（渐进式展开） |
| `MobileRuleCard` | `items/views/MobileRuleCard.tsx` | 移动端规则卡片 |

### 抽屉 (`items/drawers/`)
| 组件 | 文件 | 用途 |
|------|------|------|
| `ConfigDrawer` | `items/drawers/ConfigDrawer.tsx` | 商品配置编辑抽屉 |
| `ItemEditDrawer` | `items/drawers/ItemEditDrawer.tsx` | 商品编辑抽屉（含折叠表单区） |
| `RuleDrawer` | `items/drawers/RuleItemsAllDrawer.tsx` | 全部规则项抽屉（⚠ 导出名与文件名不符） |
| `KeywordDrawer` | `items/drawers/RulesItemsingleDrawer.tsx` | 单个规则项抽屉（⚠ 文件名拼写错误，应为 RuleItemSingleDrawer） |

### 子组件 (`items/parts/`)
| 组件 | 文件 | 用途 |
|------|------|------|
| `IconToggle` | `items/parts/IconToggle.tsx` | 图标开关（用于开关列） |
| `PlaceholderPicker` | `items/parts/PlaceholderPicker.tsx` | 占位符选择器 |
| `SendCodeEditor` | `items/parts/SendCodeEditor.tsx` | 发送代码编辑器 |
| `CollapsiblePanel` | `items/parts/CollapsiblePanel.tsx` | 可折叠面板容器 |
| `ItemCardPanel` | `items/parts/ItemCardPanel.tsx` | 商品卡片面板 |
| `RuleBindingPanel` | `items/parts/RuleBindingPanel.tsx` | 规则绑定面板（关联商品/商品组） |
| `KeywordRuleForm` | `items/parts/KeywordRuleForm.tsx` | 关键词规则表单 |
| `SearchChip` | `items/parts/SearchChip.tsx` | 搜索条件芯片（可编辑/可删除） |
| `ItemsFilterBarDesktop` | `items/parts/ItemsFilterBarDesktop.tsx` | 桌面端筛选栏（一行三区：刷新/筛选芯片/清空） |
| `ItemsFilterBarMobile` | `items/parts/ItemsFilterBarMobile.tsx` | 移动端筛选栏（搜索+排序+筛选） |
| `RuleTable` | `items/rules/RuleTable.tsx` | 规则表格 |

## 设置组件 (`components/settings/`)

| 组件 | 文件 | 用途 |
|------|------|------|
| `AIConfigTab` | `settings/AIConfigTab.tsx` | AI 配置 Tab（493行，已提取 AIConfigFormFields） |
| `NotificationTab` | `settings/NotificationTab.tsx` | 通知渠道 Tab |

## AI 配置 (`components/ai-config/`)

| 组件 | 文件 | 用途 |
|------|------|------|
| `AIConfigForm` | `ai-config/AIConfigForm.tsx` | AI 配置共享表单 |

## 自定义 Hooks (`hooks/`)

| Hook | 文件 | 用途 | 返回值 |
|------|------|------|--------|
| `useAuth` | `stores/auth.store.ts` | 全局认证状态 | `{ user, isAuthenticated, isLoading, login, logout, register }` |
| `useTabRouting<T>` | `hooks/useTabRouting.ts` | Tab 状态 ↔ URL 参数双向绑定 | `[activeTab, setTab]` |
| `useIsMobile` | `hooks/useIsMobile.ts` | 移动端检测（< 768px） | `boolean` |
| `useMediaQuery` | `hooks/useMediaQuery.ts` | 通用 CSS 媒体查询 | `boolean` |
| `useDebounce<T>` | `hooks/useDebounce.ts` | 值防抖 | `T` |
| `useQrLogin` | `hooks/useQrLogin.ts` | 二维码登录完整生命周期 | `{ qrData, scanStatus, start, cancel, reset }` |
| `useImStatusSnapshots` | `hooks/useImStatusSnapshots.ts` | IM 状态 SSE 订阅（单例） | `ImStatusSnapshot[]` |
| `useKeywords` | `hooks/useKeywords.ts` | 关键词规则 + 统计 | `{ rules, stats, isLoading }` |
| `useItemsPage` | `hooks/useItemsPage.ts` | 商品页数据编排（组合层，79行） | `useItemsFilters` + `useItemsData` + `useItemMutations` |
| `useItemsFilters` | `hooks/useItemsFilters.ts` | 商品筛选状态管理 | 筛选/排序/分页 状态 |
| `useItemsData` | `hooks/useItemsData.ts` | 商品数据获取（React Query） | 商品列表 + 统计 |
| `useItemMutations` | `hooks/useItemMutations.ts` | 商品变更操作 | 增删改 mutation |

## Stores (`stores/`)

| Store | 文件 | 用途 | 状态 |
|------|------|------|------|
| `useAuth` | `stores/auth.store.ts` | 认证状态管理 | ✅ 活跃使用 |

## 需要新建的统一组件

以下组件在当前项目中已有部分覆盖，但仍有未统一使用的场景：

| 组件 | 当前状态 | 建议 Props |
|------|---------|-----------|
| `Modal` | ✅ 已创建（`ui/overlay/Modal.tsx`），已迁移 4 处业务 Modal | `open`, `onClose`, `title?`, `size?`, `children`, `footer?` |
| `PriorityPill` | 🔴 待统一（2 处独立实现） | `priority`, `onChange?` |

## 待迁移到统一组件

以下内联实现已识别，待后续迁移：

| 位置 | 当前实现 | 应使用 |
|------|---------|--------|
| `AccountCard.tsx` | 内联 `fixed inset-0` 配置编辑弹窗 | `Modal` |
| `AccountTable.tsx` | 内联 `fixed inset-0` 配置编辑弹窗 | `Modal` |
| `LinkManagement.tsx` | 内联 `fixed inset-0` 链接编辑弹窗 | `Modal` |

## 文件命名约定

| 类型 | 命名方式 | 示例 |
|------|---------|------|
| 组件文件 | **PascalCase** | `EmptyState.tsx`, `AccountCard.tsx` |
| 非组件文件 | **kebab-case** | `chart-theme.ts`, `query-client.tsx` |
| 目录 | **kebab-case** | `ai-config/`, `qr-code-display.tsx` |
| Hook 文件 | **camelCase**，use 前缀 | `useIsMobile.ts`, `useTabRouting.ts` |

## 导出约定

- **统一使用命名导出**：`export function ComponentName() { ... }`
- **禁止 default export**（layout 目录下除外，为历史遗留，新组件不新增 default export）

## 已知命名问题

| 文件 | 问题 | 建议 |
|------|------|------|
| `RulesItemsingleDrawer.tsx` | 文件名拼写错误，"single" 应为 "Single" | 重命名为 `RuleItemSingleDrawer.tsx` |
| `RuleItemsAllDrawer.tsx` | 导出名 `RuleDrawer` 与文件名不一致 | 统一为 `AllRulesDrawer.tsx` 或保持导出名 |
