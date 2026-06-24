# 移动端顶部布局改造 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移动端 Header 退到右上角浮动，TabBar sticky 贴顶，释放顶部空间给内容。

**Architecture:** 纯 CSS 定位调整 + 条件渲染。Header PC 端不变，移动端改为 `absolute top-0 right-0` 仅显示两个小方块。TabBar 由各页面包裹 `sticky top-0` 容器。不引入新状态管理、不改数据流。

**Tech Stack:** Next.js + React + Tailwind CSS v3 + TypeScript

---

### Task 1: Header.tsx — 移动端退到右上角

**Files:**
- Modify: `components/layout/Header.tsx`

- [ ] **Step 1: 引入 useIsMobile hook，拆分移动端渲染分支**

Header.tsx 顶部 import 加 `useIsMobile`：

```tsx
import { useIsMobile } from '@/hooks/useIsMobile'
```

组件函数体内获取 `isMobile`：

```tsx
const isMobile = useIsMobile()
```

- [ ] **Step 2: 移动端 Header 容器改为 absolute 定位**

将 header 容器的 className 从固定值改为条件式：

```tsx
<header
  className={
    isMobile
      ? 'absolute top-0 right-0 z-20'
      : 'h-11 lg:h-14 max-lg:[@media(max-height:500px)]:h-10 bg-white border-b border-gray-200 shadow-sm flex-shrink-0'
  }
>
```

- [ ] **Step 3: 移动端 inner div 简化**

inner div（当前第 57 行）移动端不需要 `justify-between` 全宽布局：

```tsx
<div
  className={
    isMobile
      ? 'flex items-center gap-1.5 p-1'
      : 'h-full px-3 lg:px-6 max-lg:[@media(max-height:500px)]:px-2 flex items-center justify-between'
  }
>
```

- [ ] **Step 4: 移动端只渲染 Logo 方块 + 用户头像，条件隐藏其余**

品牌区、children、管理员按钮在移动端隐藏。将现有 return 内容改为条件渲染：

```tsx
{/* 左侧品牌标识 — 移动端隐藏 */}
{!isMobile && (
  <div className="flex items-center gap-2 lg:gap-3 ...">
    {/* ... 原有品牌区代码不变 ... */}
  </div>
)}

{/* 中间区域 — 移动端隐藏 */}
{!isMobile && (
  <div className="flex-1 flex items-center justify-center px-2 lg:px-4 ...">
    {children}
  </div>
)}

{/* 管理员按钮 — 移动端隐藏，入口移入下拉菜单 */}
{!isMobile && user?.role === 'administrators' && (
  <button ...>
    {/* ... 原有管理员按钮代码不变 ... */}
  </button>
)}

{/* 移动端 Logo 小方块 — 点击进管理员页 */}
{isMobile && user?.role === 'administrators' && (
  <button
    onClick={() => router.push('/admin')}
    className="min-h-11 min-w-11 w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center"
    title="管理员"
  >
    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  </button>
)}
```

- [ ] **Step 5: 用户区 — 移动端只显示头像单字，无用户名和箭头**

```tsx
{/* 右侧用户区 */}
<div className="flex-shrink-0 relative" ref={dropdownRef}>
  <button
    onClick={() => setDropdownOpen(!dropdownOpen)}
    className={
      isMobile
        ? 'min-h-11 min-w-11 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-medium text-white shadow-sm'
        : 'flex items-center gap-1.5 lg:gap-2 ... px-1.5 py-1 ... rounded-lg hover:bg-gray-100 ...'
    }
  >
    {/* 移动端：头像即按钮全部 */}
    {isMobile ? (
      userInitial
    ) : (
      <>
        <div className="w-6 h-6 lg:w-7 lg:h-7 ... rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs ... font-medium text-white shadow-sm">
          {userInitial}
        </div>
        <span className="text-xs lg:text-sm font-medium text-gray-700 ...">
          {displayName}
        </span>
        <svg className={`w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400 transition-transform ... ${dropdownOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </>
    )}
  </button>

  {/* 下拉菜单 — 移动端增加管理员入口 */}
  {dropdownOpen && (
    <div className="absolute right-0 top-full mt-1 lg:mt-1.5 w-40 lg:w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 origin-top-right duration-150">
      {/* 用户信息区 */}
      <div className="px-2.5 lg:px-3 py-2 lg:py-2.5 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {user?.role === 'administrators' ? '管理员' : '用户'}
        </p>
      </div>

      {/* 管理员入口 — 仅移动端 + 管理员角色显示 */}
      {isMobile && user?.role === 'administrators' && (
        <button
          onClick={() => { setDropdownOpen(false); router.push('/admin') }}
          className="w-full flex items-center gap-2 lg:gap-2.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors max-lg:min-h-[44px]"
        >
          <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          管理员
        </button>
      )}

      {/* 设置 */}
      <button onClick={handleSettings}
        className="w-full flex items-center gap-2 lg:gap-2.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors max-lg:min-h-[44px]">
        <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        设置
      </button>

      {/* 退出登录 */}
      <button onClick={handleLogout} disabled={isLoggingOut}
        className="w-full flex items-center gap-2 lg:gap-2.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 max-lg:min-h-[44px]">
        <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        {isLoggingOut ? '退出中...' : '退出登录'}
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 6: 检查 TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: 提交**

```bash
git add components/layout/Header.tsx
git commit -m "refactor: Header 移动端退到右上角浮动，管理员入口移入下拉菜单"
```

---

### Task 2: DashboardLayout — 移动端 main 移除顶部 padding

**Files:**
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: main 元素加 max-lg 断点的 padding 覆盖**

找到 `<main className="flex-1 min-h-0 p-4 lg:p-6 overflow-auto">`，改为：

```tsx
<main className="flex-1 min-h-0 p-4 lg:p-6 max-lg:pt-0 max-lg:px-0 overflow-auto">
```

- [ ] **Step 2: 提交**

```bash
git add app/dashboard/layout.tsx
git commit -m "refactor: DashboardLayout 移动端 main 移除顶部 padding"
```

---

### Task 3: items/page.tsx — TabBar 包裹 sticky 容器

**Files:**
- Modify: `app/dashboard/items/page.tsx`

- [ ] **Step 1: TabBar 外包裹 sticky div**

找到 section 中的 TabBar（约第 38-46 行）：

```tsx
{/* Tab 栏 — 移动端 sticky 贴顶，PC 端正常流 */}
<div className="sticky top-0 z-10 bg-white max-lg:pr-14">
  <TabBar
    tabs={[
      { key: "items", label: "商品管理" },
      { key: "rules", label: "回复规则" },
    ]}
    activeTab={activeTab}
    onTabChange={(key) => setActiveTab(key as "items" | "rules")}
    variant="overline"
  />
</div>
```

- [ ] **Step 2: 提交**

```bash
git add app/dashboard/items/page.tsx
git commit -m "refactor: items 页 TabBar 移动端 sticky 贴顶"
```

---

### Task 4: settings/page.tsx — TabBar 包裹 sticky 容器

**Files:**
- Modify: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: TabBar 外包裹 sticky div**

找到 TabBar（约第 51-56 行）：

```tsx
<div className="sticky top-0 z-10 bg-white max-lg:pr-14">
  <TabBar
    tabs={MAIN_TABS}
    activeTab={activeMainTab}
    onTabChange={(key) => setActiveMainTab(key as MainTabType)}
    variant="overline"
  />
</div>
```

- [ ] **Step 2: 提交**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "refactor: settings 页 TabBar 移动端 sticky 贴顶"
```

---

### Task 5: TypeScript 检查 + 构建验证

- [ ] **Step 1: TypeScript 零错误**

```bash
npx tsc --noEmit
```

期望：零错误。

- [ ] **Step 2: 生产构建**

```bash
npm run build
```

期望：构建成功。

- [ ] **Step 3: 提交（如有遗留）**

```bash
git status
# 如有未提交内容：
git add -A && git commit -m "chore: TypeScript 检查 + 构建验证通过"
```
