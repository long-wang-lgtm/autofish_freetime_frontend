# 移动端顶部布局重构：Tab 提升 + Header 退让 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将页面级 Tab 从内容区提升到 Header 顶部，Header 在移动端退让为右上角浮动头像，统一 PC/移动端响应式断点至 768px。

**Architecture:** TabContext（读写分离 Context 桥接层）→ Header 读取渲染 TabBar，page 通过 usePageTabs hook 注入配置。TabBar 从 ui/Tab 迁移至 layout/TabBar，仅保留 overline 形态。

**Tech Stack:** Next.js 15 + React 19 + Tailwind CSS v3 + TypeScript

**Source spec:** `docs/superpowers/specs/2026-06-23-mobile-layout-header-tab-design.md`

---

### Task 1: 新建 TabContext 桥接层

**Files:**
- Create: `components/layout/TabContext.tsx`

- [ ] **Step 1: 创建 TabContext.tsx**

```tsx
'use client'

import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react'

export interface PageTab {
  key: string
  label: string
  icon?: ReactNode
}

/** page → Context 写入的配置 */
export interface PageTabConfig {
  tabs: PageTab[]
  activeTab: string
  onTabChange: (key: string) => void
  pageTitle?: string
}

/** Header 读取的 Context 数据（不含内部 setter） */
interface TabContextData {
  tabs: PageTab[]
  activeTab: string
  onTabChange: (key: string) => void
  pageTitle?: string
}

/** 内部 Context 值 — 包含 setter */
interface TabContextInternal extends TabContextData {
  setPageTabs: (config: PageTabConfig | null) => void
}

const noop = () => {}

const defaultData: TabContextData = {
  tabs: [],
  activeTab: '',
  onTabChange: noop,
}

const TabContext = createContext<TabContextInternal>({
  ...defaultData,
  setPageTabs: noop,
})

/**
 * Header 使用的只读 hook。
 * 返回当前页面的 tab 配置，若无页面调用 usePageTabs 则返回空配置。
 */
export function useTabContext(): TabContextData {
  const { setPageTabs: _, ...data } = useContext(TabContext)
  return data
}

/**
 * 页面组件调用的 hook，将 tab 配置注入 Context。
 * 使用 useLayoutEffect 在绘制前同步更新，避免单帧闪烁。
 * 卸载时自动清空 Context，防止残留到下一页。
 */
export function usePageTabs(config: PageTabConfig | null): void {
  const { setPageTabs } = useContext(TabContext)

  useLayoutEffect(() => {
    setPageTabs(config)
    return () => setPageTabs(null)
  }, [
    config?.tabs,
    config?.activeTab,
    config?.onTabChange,
    config?.pageTitle,
  ])
}

/**
 * Provider — 包裹在 DashboardLayout 中
 */
export function TabContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = (() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useState } = require('react')
    return useState<TabContextData>(defaultData)
  })()

  // 使用函数式 setter 避免 onTabChange 作为依赖
  const setPageTabs = (config: PageTabConfig | null) => {
    if (config === null) {
      setState(defaultData)
    } else {
      setState({
        tabs: config.tabs,
        activeTab: config.activeTab,
        onTabChange: config.onTabChange,
        pageTitle: config.pageTitle,
      })
    }
  }

  return (
    <TabContext.Provider value={{ ...state, setPageTabs }}>
      {children}
    </TabContext.Provider>
  )
}
```

Wait — the above `useState` trick with `require` inside component body is wrong. Let me rewrite properly:

- [ ] **Step 1 (corrected): 创建 TabContext.tsx**

```tsx
'use client'

import { createContext, useContext, useLayoutEffect, useState, useCallback, type ReactNode } from 'react'

export interface PageTab {
  key: string
  label: string
  icon?: ReactNode
}

/** page → Context 写入的配置 */
export interface PageTabConfig {
  tabs: PageTab[]
  activeTab: string
  onTabChange: (key: string) => void
  pageTitle?: string
}

/** Header 读取的 Context 数据（不含内部 setter） */
interface TabContextData {
  tabs: PageTab[]
  activeTab: string
  onTabChange: (key: string) => void
  pageTitle?: string
}

/** 内部 Context 值 — 包含 setter */
interface TabContextInternal extends TabContextData {
  setPageTabs: (config: PageTabConfig | null) => void
}

const noop = () => {}

const defaultData: TabContextData = {
  tabs: [],
  activeTab: '',
  onTabChange: noop,
}

const TabReadContext = createContext<TabContextData>(defaultData)
const TabWriteContext = createContext<(config: PageTabConfig | null) => void>(noop)

/**
 * Header 使用的只读 hook。
 * 返回当前页面的 tab 配置，若无页面调用 usePageTabs 则返回空配置。
 */
export function useTabContext(): TabContextData {
  return useContext(TabReadContext)
}

/**
 * 页面组件调用的 hook，将 tab 配置注入 Context。
 * 使用 useLayoutEffect 在绘制前同步更新，避免单帧闪烁。
 * 卸载时自动清空 Context，防止残留到下一页。
 */
export function usePageTabs(config: PageTabConfig): void {
  const setPageTabs = useContext(TabWriteContext)

  useLayoutEffect(() => {
    setPageTabs(config)
    return () => setPageTabs(null)
  }, [
    config.tabs,
    config.activeTab,
    config.onTabChange,
    config.pageTitle,
  ])
}

/**
 * Provider — 包裹在 DashboardLayout 中
 */
export function TabContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TabContextData>(defaultData)

  const setPageTabs = useCallback((config: PageTabConfig | null) => {
    if (config === null) {
      setState(defaultData)
    } else {
      setState({
        tabs: config.tabs,
        activeTab: config.activeTab,
        onTabChange: config.onTabChange,
        pageTitle: config.pageTitle,
      })
    }
  }, [])

  return (
    <TabReadContext.Provider value={state}>
      <TabWriteContext.Provider value={setPageTabs}>
        {children}
      </TabWriteContext.Provider>
    </TabReadContext.Provider>
  )
}
```

- [ ] **Step 2: 验证 TypeScript**

Run: `npx tsc --noEmit --pretty`
Expected: PASS with zero errors (only this file needs to be error-free; dependent files not yet updated may error).

---

### Task 2: 迁移 TabBar 到 layout 目录

**Files:**
- Create: `components/layout/TabBar.tsx`
- Read source: `components/ui/Tab/index.tsx`

- [ ] **Step 1: 创建 layout/TabBar.tsx**

```tsx
'use client'

import { type ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface TabConfig {
  key: string
  label: string
  icon?: ReactNode
}

interface TabBarProps {
  tabs: TabConfig[]
  activeTab: string
  onTabChange: (key: string) => void
}

/**
 * 顶部一级 Tab 栏 — 仅 overline 形态。
 * - PC (≥md): text-base font-semibold，下划线激活
 * - Mobile (<md): 紧凑字号，可横滑，右侧 tab-mask 渐变淡出
 */
export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  const isMobile = useIsMobile()

  return (
    <div className="border-b border-gray-200">
      <div
        className={`flex items-center gap-0 ${
          isMobile ? 'overflow-x-auto hide-scrollbar tab-mask' : ''
        }`}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`inline-flex items-center gap-1.5 transition-all border-b-2 -mb-[2px] font-semibold ${
              isMobile
                ? 'px-2 py-1 text-[11px] whitespace-nowrap'
                : 'px-5 py-3 text-base'
            } ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon && tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: PASS (this file clean; old references still point to ui/Tab so they'll warn but that's expected at this stage).

---

### Task 3: 重构 Header.tsx

**Files:**
- Modify: `components/layout/Header.tsx` (full rewrite)

- [ ] **Step 1: 重写 Header.tsx**

```tsx
'use client'

import { useAuth } from '@/stores/auth.store'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTabContext } from '@/components/layout/TabContext'
import { TabBar } from '@/components/layout/TabBar'
import { useIsMobile } from '@/hooks/useIsMobile'

export default function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { tabs, activeTab, onTabChange } = useTabContext()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setDropdownOpen(false)
    try {
      await logout()
      toast.success('已成功退出登录')
      window.location.href = '/login'
    } catch (error) {
      toast.error('退出登录失败')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleSettings = () => {
    setDropdownOpen(false)
    router.push('/dashboard/settings')
  }

  const handleAdmin = () => {
    setDropdownOpen(false)
    router.push('/admin')
  }

  const userInitial = user?.username?.charAt(0).toUpperCase() || 'U'
  const displayName = user?.username || '未登录'
  const showTabs = tabs.length >= 2

  return (
    <header className="h-11 md:h-14 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
      <div className="h-full px-3 md:px-6 flex items-center">
        {/* PC: 品牌名 + 分隔线 */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0 mr-3">
          <span className="text-base font-semibold text-gray-900">闲逸通</span>
          <div className="w-px h-5 bg-gray-200" />
        </div>

        {/* Tab 行 / 品牌简写 */}
        <div className="flex-1 min-w-0 overflow-x-auto hide-scrollbar tab-mask min-h-[theme('spacing.11')] md:min-h-[theme('spacing.14')] flex items-center">
          {showTabs ? (
            <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
          ) : (
            /* 移动端无 tab 时：品牌简写 */
            <span className="md:hidden text-xs font-semibold text-gray-900">
              逸
            </span>
          )}
        </div>

        {/* PC: 管理员按钮 */}
        {user?.role === 'administrators' && (
          <button
            onClick={() => router.push('/admin')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
            title="管理员"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>管理员</span>
          </button>
        )}

        {/* 用户区 */}
        <div className="flex-shrink-0 relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 md:gap-2 px-1.5 py-1 md:px-2 md:py-1.5 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] md:min-h-0"
          >
            {/* 头像 */}
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-medium text-white shadow-sm flex-shrink-0">
              {userInitial}
            </div>
            {/* PC: 用户名 + 下拉箭头 */}
            <span className="hidden md:inline text-sm font-medium text-gray-700">
              {displayName}
            </span>
            <svg
              className={`hidden md:inline w-4 h-4 text-gray-400 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 下拉菜单 */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 md:mt-1.5 w-40 md:w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 origin-top-right duration-150">
              {/* 用户信息区 */}
              <div className="px-2.5 md:px-3 py-2 md:py-2.5 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {user?.role === 'administrators' ? '管理员' : '用户'}
                </p>
              </div>

              {/* 移动端：管理员入口 */}
              {isMobile && user?.role === 'administrators' && (
                <button
                  onClick={handleAdmin}
                  className="w-full flex items-center gap-2 md:gap-2.5 px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors min-h-[44px] md:min-h-0"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  管理员后台
                </button>
              )}

              {/* 设置 */}
              <button
                onClick={handleSettings}
                className="w-full flex items-center gap-2 md:gap-2.5 px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors min-h-[44px] md:min-h-0"
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </button>

              {/* 退出登录 */}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2 md:gap-2.5 px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 min-h-[44px] md:min-h-0"
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isLoggingOut ? '退出中...' : '退出登录'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: 验证 TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Header.tsx has 0 errors. Other files may still reference old ui/Tab — expected.

- [ ] **Step 3: Commit**

```bash
git add components/layout/Header.tsx
git commit -m "refactor: Header 重构 — 读 TabContext，移动端退让为右上角头像"
```

---

### Task 4: 更新 DashboardLayout 包裹 TabContextProvider

**Files:**
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: 修改 dashboard/layout.tsx**

将第 7 行 `import Header from '@/components/layout/Header'` 后新增 import：

```tsx
import { TabContextProvider } from '@/components/layout/TabContext'
```

将第 34-36 行的 `<Header />` 包裹：

```tsx
{/* 顶部栏：Tab 导航 + 用户信息 */}
<TabContextProvider>
  <Header />
</TabContextProvider>
```

完整改动后文件应为：

```tsx
'use client'

import { useAuth } from '@/stores/auth.store'
import { redirect } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { TabContextProvider } from '@/components/layout/TabContext'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) redirect('/login')

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 右侧区域：顶部栏 + 主内容 */}
      <div
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        {/* 顶部栏：Tab 导航 + 用户信息 */}
        <TabContextProvider>
          <Header />
        </TabContextProvider>

        {/* 主内容区域 */}
        <main className="flex-1 min-h-0 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript**

Run: `npx tsc --noEmit --pretty`
Expected: layout.tsx clean.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "refactor: DashboardLayout 包裹 TabContextProvider，侧边栏断点 lg→md"
```

---

### Task 5: 更新 items/page.tsx — TabBar → usePageTabs

**Files:**
- Modify: `app/dashboard/items/page.tsx`

- [ ] **Step 1: 替换 TabBar 为 usePageTabs**

替换 import（第 5 行）：
```tsx
// 改前
import { TabBar } from "@/components/ui/Tab"

// 改后
import { usePageTabs } from "@/components/layout/TabContext"
```

替换 `<TabBar ... />` 的 JSX（第 38-46 行）：
```tsx
// 删除这段
<TabBar
  tabs={[
    { key: "items", label: "商品管理" },
    { key: "rules", label: "回复规则" },
  ]}
  activeTab={activeTab}
  onTabChange={(key) => setActiveTab(key as "items" | "rules")}
  variant="overline"
/>

// 替换为
usePageTabs({
  tabs: [
    { key: "items", label: "商品管理" },
    { key: "rules", label: "回复规则" },
  ],
  activeTab,
  onTabChange: (key) => setActiveTab(key as "items" | "rules"),
})
```

注意：`usePageTabs` 必须在组件顶层调用（不能在条件判断后），当前代码中已在 `useItemsPage()` 和 `useTabRouting()` 之后调用，位置正确。

- [ ] **Step 2: 验证 TypeScript**

Run: `npx tsc --noEmit --pretty`
Expected: items/page.tsx clean.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/items/page.tsx
git commit -m "refactor: items 页面 TabBar → usePageTabs"
```

---

### Task 6: 更新 settings/page.tsx — TabBar → usePageTabs

**Files:**
- Modify: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: 替换 TabBar 为 usePageTabs**

替换 import（第 7 行）：
```tsx
// 改前
import { TabBar } from '@/components/ui/Tab'

// 改后
import { usePageTabs } from '@/components/layout/TabContext'
```

替换 `<TabBar ... />` JSX（第 51-56 行）：
```tsx
// 删除
<TabBar
  tabs={MAIN_TABS}
  activeTab={activeMainTab}
  onTabChange={(key) => setActiveMainTab(key as MainTabType)}
  variant="overline"
/>

// 替换为
usePageTabs({
  tabs: MAIN_TABS,
  activeTab: activeMainTab,
  onTabChange: (key) => setActiveMainTab(key as MainTabType),
})
```

`MAIN_TABS` 已包含 `icon` 字段（emoji），`PageTab` interface 的 `icon?: ReactNode` 接受 `string` — 类型兼容。

- [ ] **Step 2: 验证 TypeScript**

Run: `npx tsc --noEmit --pretty`
Expected: settings/page.tsx clean.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "refactor: settings 页面 TabBar → usePageTabs"
```

---

### Task 7: 更新 publish/page.tsx — 删除单 Tab 的 TabBar

**Files:**
- Modify: `app/dashboard/publish/page.tsx`

- [ ] **Step 1: 移除 TabBar 相关代码**

删除第 5 行 import：
```tsx
// 删除
import { TabBar } from '@/components/ui/Tab'
```

删除第 16-18 行的 `PUBLISH_TABS` 常量（仅被 TabBar 使用）：
```tsx
// 删除
const PUBLISH_TABS: { key: string; label: string }[] = [
  { key: 'publish', label: '商品发布' },
]
```

删除第 93-98 行的 `<TabBar>` JSX：
```tsx
// 删除
{/* 一级 Tab 栏 */}
<TabBar
  tabs={PUBLISH_TABS}
  activeTab="publish"
  onTabChange={() => {}}
  variant="overline"
/>
```

- [ ] **Step 2: 验证 TypeScript**

Run: `npx tsc --noEmit --pretty`
Expected: publish/page.tsx clean.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/publish/page.tsx
git commit -m "refactor: publish 页面移除单 tab 的 TabBar"
```

---

### Task 8: 更新 selection/page.tsx — TabBar → usePageTabs + 设置按钮迁入内容区

**Files:**
- Modify: `app/dashboard/selection/page.tsx`

- [ ] **Step 1: 替换 import，拆分设置按钮**

替换 import（第 4 行）：
```tsx
// 改前
import { TabBar } from '@/components/ui/Tab'

// 改后
import { usePageTabs } from '@/components/layout/TabContext'
```

在组件顶层（第 22 行 `useTabRouting` 之后）添加：
```tsx
usePageTabs({
  tabs: SELECTION_TABS,
  activeTab: selectionTab,
  onTabChange: (key) => setSelectionTab(key as TabName),
})
```

删除第 32-46 行原有的工具栏 flex 行：
```tsx
// 删除
{/* 顶部工具栏：TabBar + 设置按钮 */}
<div className="flex items-center justify-between">
  <TabBar
    tabs={SELECTION_TABS}
    activeTab={selectionTab}
    onTabChange={(key) => setSelectionTab(key as TabName)}
    variant="overline"
  />
  <button
    onClick={() => setSettingsOpen(true)}
    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors"
  >
    <Settings className="w-4 h-4" />
    <span>设置</span>
  </button>
</div>
```

在内容区顶部添加设置按钮（放在 Tab 内容之前，单占一行右对齐）：
```tsx
{/* 设置按钮 — 内容区右上角 */}
<div className="flex justify-end">
  <button
    onClick={() => setSettingsOpen(true)}
    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors"
  >
    <Settings className="w-4 h-4" />
    <span>设置</span>
  </button>
</div>
```

- [ ] **Step 2: 验证 TypeScript**

Run: `npx tsc --noEmit --pretty`
Expected: selection/page.tsx clean.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/selection/page.tsx
git commit -m "refactor: selection 页面 TabBar → usePageTabs，设置按钮迁入内容区"
```

---

### Task 9: 删除旧 ui/Tab/index.tsx

**Files:**
- Delete: `components/ui/Tab/index.tsx`

- [ ] **Step 1: 确认无残留引用**

Run: `npx tsc --noEmit --pretty 2>&1`
Expected: PASS with 0 errors. If any file still imports from `@/components/ui/Tab`, fix it first.

- [ ] **Step 2: 删除文件并 commit**

```bash
git rm components/ui/Tab/index.tsx
git commit -m "refactor: 删除旧 ui/Tab 组件，已迁移至 layout/TabBar"
```

---

### Task 10: 全量 TypeScript 检查 + 构建验证

**Files:** (验证，不改代码)

- [ ] **Step 1: TypeScript 全量检查**

Run: `npx tsc --noEmit --pretty`
Expected: PASS, zero errors.

- [ ] **Step 2: 生产构建**

Run: `npx next build 2>&1 | tail -20`
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit (如有构建配置调整)**

Only if next.config or other build files changed — otherwise skip.

---

### Task 11: 编写移动端布局设计规范

**Files:**
- Create: `.claude/rules/frontend-mobile.md`

- [ ] **Step 1: 编写规范文档**

```markdown
# 移动端布局设计规范

> 参考各大 app 移动端设计（闲鱼、淘宝），定义本项目的移动端顶层布局原则。

## 核心原则

### 1. 三级顶部结构

移动端页面顶部按视觉重量和导航层级排列三行：

| 行 | 内容 | 控制方 | 样式 |
|----|------|--------|------|
| 第 1 行 | 一级 Tab 页签（可横滑） + 用户头像 | layout（Header） | `text-[11px] font-semibold`，下划线激活 |
| 第 2 行 | 搜索栏 | 页面 | `text-sm`，圆角输入框 |
| 第 3 行 | 子标签 / 状态筛选 | 页面 | `text-xs`，Pill 切换 |

```
┌──────────────────────────────────┐
│ 商品管理  回复规则  ⇄     [逸] ▼ │  ← Tab（可横滑）+ 用户
│ 🔍 搜索...                       │  ← 搜索（页面决定有无）
│ 全部 | 在售 | 仓库 | 已售        │  ← 子标签（页面决定有无）
├──────────────────────────────────┤
│ (卡片内容区)                     │
└──────────────────────────────────┘
```

### 2. Header 退让原则

- **PC 端（≥768px / md）**：Header 包含品牌名 + Tab 行 + 管理员按钮 + 用户信息，占满一行
- **移动端（<768px / md）**：Header 仅保留 Tab 行（左侧可横滑）+ 用户头像（右上角），品牌名隐藏，管理员入口移入用户下拉菜单

### 3. 断点统一

所有响应式断点统一使用 Tailwind 的 `md:`（768px），与 `useIsMobile()` hook 对齐。

### 4. 一级导航 vs 二级 Tab

- **一级导航**：Sidebar（移动端隐藏，FAB 唤出），含「账号管理」「商品管理」「商品发布」「选品监控」「设置」
- **二级 Tab**：页面内 tab，通过 `usePageTabs()` 注入到 Header 顶部。仅当 tab 数量 ≥ 2 时显示在 Header

### 5. 横滑处理

移动端 Tab 超出屏幕宽度时：
- `overflow-x-auto` 允许横滑
- `hide-scrollbar` 隐藏滚动条
- `tab-mask` 右侧渐变淡出（暗示还有更多）
- 激活态自动 `scrollIntoView`

### 6. 固定高度防抖

Header 高度固定为 `h-11 md:h-14`，Tab 区域始终保持 `min-h`。页面切换时 Header 高度不变化，避免布局跳动。

## 反模式

- Tab 只有 1 个时还提升到 Header（浪费空间，无导航价值）
- 移动端 Header 占满整行（挤压 Tab 空间）
- 断点不统一（混用 `sm:` / `md:` / `lg:`）
- Tab 行有/无时 Header 高度跳变
- 二级控件比一级 Tab 更鲜艳/更大/更粗
- 在页面内容区再加 TabBar（应通过 usePageTabs 提升到顶部）

## 相关文件

| 文件 | 职责 |
|------|------|
| `components/layout/TabContext.tsx` | Context 桥接层 — usePageTabs / useTabContext |
| `components/layout/TabBar.tsx` | 一级 Tab 栏组件 |
| `components/layout/Header.tsx` | 顶部栏 — 渲染 Tab + 用户区 |
| `hooks/useIsMobile.ts` | 移动端判断（<768px） |
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/frontend-mobile.md
git commit -m "docs: 添加移动端布局设计规范 frontend-mobile.md"
```

---

### Task 12: 更新 CLAUDE.md 引用新规范

**Files:**
- Modify: `CLAUDE.md`（第 10-16 行）

- [ ] **Step 1: 添加 mobile 规范引用**

在「按需加载」表格中新增一行：

```markdown
## 按需加载

| 模块 | 用途 |
|------|------|
| `@.claude/rules/frontend-tabs.md` | Tab 页面视觉设计规范 |
| `@.claude/rules/frontend-mobile.md` | 移动端布局设计规范 |
| `@.claude/rules/frontend-api.md` | API 接口设计规范 |
| `@components/ui/` | UI 组件库 |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 引用移动端布局设计规范"
```

---

### Task 13: 最终验证

- [ ] **Step 1: 全量 TypeScript 检查**

Run: `npx tsc --noEmit --pretty`
Expected: PASS, zero errors.

- [ ] **Step 2: 生产构建**

Run: `npx next build 2>&1 | tail -25`
Expected: BUILD SUCCESS, all pages compiled.

- [ ] **Step 3: 检查 git 状态**

Run: `git status`
Expected: clean (all changed files committed).

- [ ] **Step 4: 查看最终 commit log**

Run: `git log --oneline -12`
Expected: 12 commits covering the full implementation.
