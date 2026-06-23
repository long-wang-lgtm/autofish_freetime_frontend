# 移动端顶部布局重构：Tab 提升 + Header 退让

> 日期：2026-06-23 | 涉及：Header、TabBar、DashboardLayout、各页面

## 目标

参考主流 app（闲鱼、淘宝）的移动端顶层设计，将页面级 Tab 页签从内容区提升到顶部，Header 从独占一行退让为右上角浮动头像。

## 现状

```
┌──────────────────────────────────────┐
│ [逸]       (children)     [管理] [U] │  ← Header 占一整行
├──────────────────────────────────────┤
│                                      │
│  ┌ TabBar (片段) ───────────────┐    │  ← 各 page 内部自行渲染
│  │ 商品管理 | 回复规则           │    │
│  └──────────────────────────────┘    │
│  (内容)                              │
└──────────────────────────────────────┘
```

问题：
- Header 在移动端占据稀缺的垂直空间，却只有品牌名（「逸」）和按钮
- Tab 埋在页面内容区，视觉层级低，切换不便
- 移动端顶部有三行需求（tab / 搜索 / 子筛选），目前各页面自行堆叠，没有统一位置

## 目标布局

### 移动端 (< md, 即 768px)

```
┌──────────────────────────────────┐
│ 商品管理  回复规则  ⇄     [逸] ▼ │  ← Header: TabBar(左,可横滑) + 用户头像(右)
├──────────────────────────────────┤
│ 🔍 搜索商品...                   │  ← 搜索栏（页面自己决定有无）
│ 全部 | 在售 | 仓库 | 已售        │  ← 子标签/筛选（页面自己决定）
├──────────────────────────────────┤
│ (卡片内容区)                     │
└──────────────────────────────────┘
```

无 Tab 的页面（如账号管理）：Header 左侧显示品牌简写「逸」，右侧用户头像不变。

### PC 端 (≥ md, 即 768px)

Tab 从 Context 读取，logo 与 tab 之间用细竖线分隔区分区域：

```
┌──────────────────────────────────────────────────┐
│ [闲逸通] │ 商品管理 | 回复规则    [管理] [U ▼]   │
├──────────────────────────────────────────────────┤
│ (内容)                                           │
└──────────────────────────────────────────────────┘
```

分隔线使用 `border-l border-gray-200`，仅做视觉分区，不抢眼。

## 层级职责

| 区域 | 位置 | 控制方 | 说明 |
|------|------|--------|------|
| 一级导航 | Sidebar（移动端隐藏，FAB 唤出） | layout 固定 | 不变 |
| 二级 Tab | Header 左侧 | **layout 提供槽位，page 通过 Context 注入** | 本次改动，仅 ≥2 个 tab 时显示 |
| 搜索/子标签/筛选 | 页面内容区顶部 | 页面自己决定 | 不变 |
| 用户头像+下拉 | Header 右侧 | layout 固定 | 移动端仅显示单字，管理员入口入下拉 |

## 实现方案

### 1. TabContext — 桥接层

新建 `components/layout/TabContext.tsx`。

**接口设计** —— 读写分离，避免内部 setter 泄露到消费端：

```tsx
// page → Context 写入（usePageTabs 内部使用）
interface PageTabConfig {
  tabs: PageTab[]
  activeTab: string
  onTabChange: (key: string) => void
  pageTitle?: string  // 无 tab 页面的标题 fallback
}

// Context 读取端（Header 使用）
interface TabContextData {
  tabs: PageTab[]
  activeTab: string
  onTabChange: (key: string) => void
  pageTitle?: string
}
```

- `usePageTabs(config)` — page 调用，通过 `useLayoutEffect` 同步写入 Context（避免单帧闪烁），cleanup 时清空
- `useTabContext()` — Header 调用，只读
- Tab 数量 ≥2 时才在 Header 渲染 TabBar（`minTabsForHeader: 2` 规则）

### 2. TabBar 迁移

`components/ui/Tab/index.tsx` → `components/layout/TabBar.tsx`

改动点：
- 去除 `inset` variant（Tab 不再出现在卡片内部，只保留 `overline` 形态）
- 合并响应式断点：统一使用 `md:` (768px)，与 `useIsMobile()` 对齐
- 移动端适配横滑：`overflow-x-auto hide-scrollbar whitespace-nowrap tab-mask`
- PC 端保持不变：`text-base font-semibold`，下划线激活
- Header 固定高度 `h-11 md:h-14`，tab 区域始终保持固定 `min-h`，避免有无 tab 时高度跳变

### 3. Header 重构

```tsx
// PC (≥ md): 品牌名 │ TabBar(from Context) + 管理按钮 + 用户区
// Mobile (< md): TabBar(from Context) 或品牌简写 + 用户单字按钮

export default function Header() {
  const { tabs, activeTab, onTabChange, pageTitle } = useTabContext()
  const { user, logout } = useAuth()
  const isMobile = useIsMobile()
  const showTabs = tabs.length >= 2  // minTabsForHeader 规则

  return (
    <header className="h-11 md:h-14 ...">
      <div className="flex items-center justify-between h-full">
        {/* PC: 品牌名 + 分隔线 */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <span className="text-base font-semibold text-gray-900">闲逸通</span>
          <div className="w-px h-5 bg-gray-200" />
        </div>

        {/* Tab 行 / 页面标题 */}
        <div className="flex-1 min-w-0 overflow-x-auto hide-scrollbar tab-mask min-h-[theme-spacing.11] md:min-h-[theme-spacing.14]">
          {showTabs && (
            <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
          )}
          {/* 移动端无 tab 时：品牌简写 */}
          {!showTabs && (
            <span className="md:hidden text-xs font-semibold text-gray-900 px-1">
              逸
            </span>
          )}
        </div>

        {/* PC: 管理员按钮 */}
        {user?.role === 'administrators' && (
          <button onClick={...} className="hidden md:flex ...">管理员</button>
        )}

        {/* 用户区：PC 显示用户名+下拉，移动端仅单字头像 */}
        <div className="flex-shrink-0 relative" ref={dropdownRef}>
          <button onClick={toggleDropdown}>
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient...">
              {userInitial}
            </div>
            <span className="hidden md:inline ...">{displayName}</span>
            <ChevronDown className="hidden md:inline ..." />
          </button>
          {dropdownOpen && (
            <DropdownMenu>
              {/* 移动端：管理员入口在顶部 */}
              {isMobile && user?.role === 'administrators' && (
                <button onClick={handleAdmin}>管理员后台</button>
              )}
              <button onClick={handleSettings}>设置</button>
              <button onClick={handleLogout}>退出登录</button>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
```

关键变化：
- 移除了 `children` prop（无任何使用者）
- 响应式断点统一 768px（`md:`），与 `useIsMobile()` 一致
- 移动端管理员按钮消失，出现在用户下拉菜单中
- Header 高度固定，避免有无 tab 时的布局抖动
- 用户下拉逻辑保留在 Header 内联（不单独提取组件，避免过度工程化）

### 4. DashboardLayout 调整

```tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex">
      <Sidebar ... />
      <div className="flex-1 min-w-0 flex flex-col">
        <TabContextProvider>
          <Header />
          <main className="flex-1 min-h-0 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </TabContextProvider>
      </div>
    </div>
  )
}
```

### 5. 各页面改动细节

#### items、settings 页面 — 直接替换

```tsx
// 改前
<TabBar tabs={...} activeTab={...} onTabChange={...} variant="overline" />

// 改后
usePageTabs({ tabs: [...], activeTab, onTabChange: (key) => setActiveTab(key) })
```

#### publish 页面 — 不参与 Context

- PC 端 publish 只有一个 tab「商品发布」，不满足 `minTabsForHeader: 2`，Header 无 TabBar
- 移动端 publish 使用 `MobileTabView`（底部 tab「商机库 / 创作+发布」），这是页面内部布局，完全不受影响
- 该页面的 `<TabBar variant="overline">` 直接删除，不替换

#### selection 页面 — 设置按钮需重新安置

selection 页面当前将 TabBar 和设置按钮放在同一 flex 行：

```tsx
<div className="flex items-center justify-between">
  <TabBar ... />
  <button>设置</button>
</div>
```

改后：TabBar 通过 Context 进入 Header，设置按钮移至页面内容区顶部右侧（独立一行或粘性定位）。

#### accounts 页面 — 无需改动

accounts 页面没有 TabBar，不调用 `usePageTabs`，Header 移动端左侧显示「逸」品牌简写。

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `components/layout/TabContext.tsx` | **新建** | Context + usePageTabs hook + useTabContext hook |
| `components/layout/TabBar.tsx` | **新建** | 从 ui/Tab 迁移，仅保留 overline，断点统一 768px |
| `components/layout/Header.tsx` | **修改** | 读 Context，移动端退让，管理员入口入下拉 |
| `app/dashboard/layout.tsx` | **修改** | 包裹 TabContextProvider |
| `app/dashboard/items/page.tsx` | **修改** | TabBar → usePageTabs |
| `app/dashboard/settings/page.tsx` | **修改** | TabBar → usePageTabs |
| `app/dashboard/publish/page.tsx` | **修改** | 删除 TabBar（单 tab 不满足 minTabsForHeader） |
| `app/dashboard/selection/page.tsx` | **修改** | TabBar → usePageTabs，设置按钮迁入内容区 |
| `components/ui/Tab/index.tsx` | **删除** | 迁移后移除 |

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| Context 残留上一页数据 | `usePageTabs` cleanup 时清空 |
| Context 写入时机导致闪烁 | 使用 `useLayoutEffect`，绘制前同步更新 |
| 移动端 tab 过多时横滑体验 | 激活态自动 `scrollIntoView` |
| 有无 tab 时 Header 高度跳变 | Header 固定高度，tab 区域固定 min-h |
| 浏览器后退/前进 tab 状态错乱 | `useTabRouting` 通过 URL query 驱动，popstate 正常触发重渲染 |
| 历史文档引用 `@/components/ui/Tab` | 仅代码片段失效，不影响运行代码 |
