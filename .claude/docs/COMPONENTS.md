# 组件索引

> 列出项目中所有可复用组件及其用途。新建功能前应先查阅此索引，避免重复造轮子。

## 布局组件 (`components/layout/`)

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `Sidebar` | `layout/Sidebar.tsx` | 用户端侧边栏，含 5 个导航项、可折叠、移动端 FAB 拖拽 | — |
| `Header` | `layout/Header.tsx` | 用户端顶栏，含品牌标识、管理员入口、用户下拉菜单 | `children?: ReactNode` |
| `AdminSidebar` | `layout/AdminSidebar.tsx` | 管理端侧边栏，含管理导航项、可折叠、FAB 拖拽 | — |

## 通用 UI 组件 (`components/ui/`)

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `TabBar` | `ui/Tab/index.tsx` | 核心 Tab 组件，支持 overline/inset 变体，响应式三档 | `tabs`, `activeTab`, `onTabChange`, `variant?` |
| `Sheet` | `ui/Sheet.tsx` | 抽屉/底部弹出容器，支持手势拖拽关闭 | `open`, `onClose`, `width?`, `children` |
| `LoadingSpinner` | `ui/loading-spinner.tsx` | 加载动画指示器 | `size?: 'sm' \| 'md' \| 'lg'` |
| `useToast` / `Toaster` | `ui/toaster.tsx` | Toast 通知系统（封装 sonner） | —（hook 返回 `toast.xxx()` 方法） |
| `SlidePanel` | `ui/slide-panel.tsx` | 滑出面板，点击外部自动关闭 | `open`, `onClose`, `position`, `children` |
| `QRCodeDisplay` | `ui/qr-code-display.tsx` | 二维码展示（含 base64 解码、过期遮罩） | `base64Data`, `expired?`, `onRefresh?` |
| `ProxyItem` | `ui/proxy-item.tsx` | 代理项展示卡片 | `proxy`, `onEdit?`, `onDelete?` |
| `TextEditor` | `ui/text-editor.tsx` | 文本编辑器（含占位符插入、字数统计） | `value`, `onChange`, `placeholder?`, `maxHeight?` |
| `useChart` | `ui/echart/useChart.ts` | ECharts 实例生命周期管理 hook | `options`, `theme?` |
| `ImStatusChart` | `ui/echart/ImStatusChart.tsx` | IM 状态实时折线图（消费 SSE 数据） | `snapshots` |
| `AccountPieChart` | `ui/echart/AccountPieChart.tsx` | 账号分布环形饼图 | `data` |

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
| `ItemsTab` | `items/ItemsTab.tsx` | 商品管理 Tab 内容（表格/卡片切换） |
| `RulesTab` | `items/RulesTab.tsx` | 回复规则 Tab 内容（含统计卡片） |
| `FilterBar` | `items/FilterBar.tsx` | 筛选栏（含 FilterBarDesktop + FilterBarMobile） |

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
| `RuleTable` | `items/rules/RuleTable.tsx` | 规则表格 |

## 选品监控组件 (`components/selection/`)

### 关键词 (`selection/keyword/`)
| 组件 | 文件 | 用途 |
|------|------|------|
| `KeywordCollectionTab` | `selection/keyword/KeywordCollectionTab.tsx` | 关键词采集主 Tab（含左右分栏） |
| `KeywordsConfig` | `selection/keyword/KeywordsConfig.tsx` | 关键词配置面板 |
| `NewKeywordModal` | `selection/keyword/NewKeywordModal.tsx` | 新建关键词弹窗 |
| `ReportCard` | `selection/keyword/ReportCard.tsx` | 采集报告卡片 |
| `ReportControlBar` | `selection/keyword/ReportControlBar.tsx` | 报告控制栏 |
| `ReportSubTabs` | `selection/keyword/ReportSubTabs.tsx` | 报告子 Tab |
| `VerticalTimeline` | `selection/keyword/VerticalTimeline.tsx` | 垂直时间线组件 |

### 商品监控 (`selection/product/`)
| 组件 | 文件 | 用途 |
|------|------|------|
| `ProductMonitorTab` | `selection/product/ProductMonitorTab.tsx` | 商品监控主 Tab（623行，需拆分） |
| `ProductDiagnosticDrawer` | `selection/product/ProductDiagnosticDrawer.tsx` | 商品诊断抽屉（含异常检测+图表） |
| `MiniTrendChart` | `selection/product/MiniTrendChart.tsx` | 迷你趋势图（SVG 90x32px） |
| `TrendChart` | `selection/product/TrendChart.tsx` | 趋势图表（ECharts） |
| `CumulativeGrowthChart` | `selection/product/CumulativeGrowthChart.tsx` | 累计增长图（双Y轴） |
| `IntentConversionChart` | `selection/product/IntentConversionChart.tsx` | 买卖意愿图（询单率/收藏率） |
| `TrafficActionChart` | `selection/product/TrafficActionChart.tsx` | 流量转化图 |
| `AnomalyBanner` | `selection/product/AnomalyBanner.tsx` | 异常横幅 |
| `GrowthPricePanel` | `selection/product/GrowthPricePanel.tsx` | 增长价格面板 |
| `StabilityPanel` | `selection/product/StabilityPanel.tsx` | 稳定性面板 |
| `WindowCompareCards` | `selection/product/WindowCompareCards.tsx` | 时间段对比卡片（D1/D3/D7） |

### 商家监控 (`selection/merchant/`)
| 组件 | 文件 | 用途 |
|------|------|------|
| `MerchantMonitorTab` | `selection/merchant/MerchantMonitorTab.tsx` | 商家监控 Tab |

### 共享 (`selection/shared/`)
| 组件 | 文件 | 用途 |
|------|------|------|
| `DateListSidebar` | `selection/shared/DateListSidebar.tsx` | 日期列表侧栏 |
| `HeatmapCalendar` | `selection/shared/HeatmapCalendar.tsx` | 热力图日历 |
| `ViewToggle` | `selection/shared/ViewToggle.tsx` | 视图切换开关 |
| `SettingsDrawer` | `selection/shared/SettingsDrawer.tsx` | 设置抽屉 |

### 配置 (`selection/config/`)
| 组件 | 文件 | 用途 |
|------|------|------|
| `CollectionConfig` | `selection/config/CollectionConfig.tsx` | 采集配置 |
| `AccountsConfig` | `selection/config/AccountsConfig.tsx` | 账号配置 |
| `AIConfig` | `selection/config/AIConfig.tsx` | AI 配置 |

## 发布组件 (`components/publish/`)

| 组件 | 文件 | 用途 |
|------|------|------|
| `OpportunityLibrary` | `publish/OpportunityLibrary.tsx` | 商机库列表（左侧面板） |
| `PublishWorkspace` | `publish/PublishWorkspace.tsx` | 发布工作区（右侧面板） |
| `OpportunityCard` | `publish/OpportunityCard.tsx` | 商机卡片 |
| `OpportunityHeader` | `publish/OpportunityHeader.tsx` | 商机头部（含展开详情） |
| `OpportunityDetailCard` | `publish/OpportunityDetailCard.tsx` | 商机详情卡片 |
| `PublishInstanceList` | `publish/PublishInstanceList.tsx` | 发布素材列表（694行，需拆分） |
| `EditorPanel` | `publish/EditorPanel.tsx` | 编辑器面板 |
| `EditorDrawer` | `publish/EditorDrawer.tsx` | 编辑器抽屉 |
| `CreationProgressBar` | `publish/CreationProgressBar.tsx` | 创作进度条（4步流水线） |
| `MobileTabView` | `publish/MobileTabView.tsx` | 移动端底部 Tab 视图 |
| `ResizableDivider` | `publish/ResizableDivider.tsx` | 可拖拽分隔线 |
| `ImageLightbox` | `publish/ImageLightbox.tsx` | 图片灯箱 |
| `NewOpportunityModal` | `publish/NewOpportunityModal.tsx` | 新建商机弹窗 |
| `NewPublishedItemModal` | `publish/NewPublishedItemModal.tsx` | 新建发布素材弹窗 |

## 设置组件 (`components/settings/`)

| 组件 | 文件 | 用途 |
|------|------|------|
| `AIConfigTab` | `settings/AIConfigTab.tsx` | AI 配置 Tab（554行，表单重复） |
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
| `useItemsPage` | `hooks/useItemsPage.ts` | 商品页数据编排（30+ 属性出口） | 筛选/排序/分页/CRUD 全套状态 |

## Stores (`stores/`)

| Store | 文件 | 用途 | 状态 |
|------|------|------|------|
| `useAuth` | `stores/auth.store.ts` | 认证状态管理 | ✅ 活跃使用 |

## 需要新建的统一组件

以下组件在当前项目中以 3-5 种不同形式存在，需要在重构中统一：

| 组件 | 当前状态 | 建议 Props |
|------|---------|-----------|
| `EmptyState` | 5 种实现（emoji/SVG/纯文字/有CTA/无CTA） | `icon`, `title`, `description?`, `action?` |
| `ErrorBanner` | 3 种（有的带 m-4、有的不带） | `message`, `onRetry?` |
| `ConfirmDialog` | 用 window.confirm 替代 | `title`, `message`, `onConfirm`, `onCancel` |
| `Pagination` | admin 3 个页面各定义一次 | `current`, `total`, `onChange` |
| `StatusBadge` | STATUS_MAP 重复定义 2 次 | `status`, `size?` |
| `PriorityPill` | 2 处独立实现 | `priority`, `onChange?` |
| `SearchToolbar` | 5 种筛选栏实现 | `variant: 'simple' \| 'full'`, `fields` |
| `DataTable` | 多个表格各自实现 sticky header | `columns`, `data`, `stickyHeader?` |

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
