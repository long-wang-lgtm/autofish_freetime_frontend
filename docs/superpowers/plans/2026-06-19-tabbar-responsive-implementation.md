# TabBar Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TabBar responsive across PC / landscape mobile / portrait mobile, and unify settings page to use TabBar.

**Architecture:** TabBar internally calls `useIsMobile()` + `useMediaQuery('(orientation: landscape)')` to derive three size tiers. Mobile tiers use horizontal scroll + right-edge CSS mask gradient. Settings page drops its inline tab bar in favor of `<TabBar variant="overline">`.

**Tech Stack:** Next.js + React + Tailwind CSS v3. No new dependencies.

---

### Task 1: Add scrollbar-hiding CSS utility

**Files:**
- Modify: `styles/globals.css` (append after line 87)

- [ ] **Step 1: Add `.hide-scrollbar` class to globals.css**

Append after the existing `.custom-scrollbar` block:

```css
/* 完全隐藏滚动条 — 用于 TabBar 等场景 */
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/globals.css
git commit -m "feat: add .hide-scrollbar utility class

Cross-browser scrollbar hiding for tab bar mobile layout.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Rewrite TabBar with responsive layout

**Files:**
- Modify: `components/ui/Tab/index.tsx` (entire file)

- [ ] **Step 1: Replace TabBar implementation**

Replace the entire content of `components/ui/Tab/index.tsx`:

```tsx
'use client'

import { type ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Tab 样式变体 */
export type TabVariant = 'inset' | 'overline'

interface Tab {
  key: string
  label: string
  icon?: ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (key: string) => void
  /** inset = 栏在容器内，overline = 栏在容器外 */
  variant?: TabVariant
}

function useTabSize() {
  const isMobile = useIsMobile()
  const isLandscape = useMediaQuery('(orientation: landscape)')

  if (!isMobile) return 'pc' as const
  if (isLandscape) return 'landscape-mobile' as const
  return 'portrait-mobile' as const
}

/** 各尺寸档位的样式 */
const SIZE_STYLES = {
  pc: {
    outer: 'gap-0',
    button: 'px-5 py-3 text-base',
  },
  'landscape-mobile': {
    outer: 'gap-1 overflow-x-auto hide-scrollbar',
    button: 'px-4 py-2 text-sm whitespace-nowrap',
  },
  'portrait-mobile': {
    outer: 'gap-1 overflow-x-auto hide-scrollbar',
    button: 'px-3 py-1.5 text-xs whitespace-nowrap',
  },
} as const

/** 右侧渐变遮罩 — 仅在移动端使用 */
function MaskStyle() {
  return (
    <style>{`
      .tab-mask {
        mask-image: linear-gradient(to right, black calc(100% - 32px), transparent 100%);
        -webkit-mask-image: linear-gradient(to right, black calc(100% - 32px), transparent 100%);
      }
    `}</style>
  )
}

export function TabBar({ tabs, activeTab, onTabChange, variant = 'inset' }: TabBarProps) {
  const size = useTabSize()
  const s = SIZE_STYLES[size]
  const isMobile = size !== 'pc'

  if (variant === 'overline') {
    return (
      <>
        {isMobile && <MaskStyle />}
        <div className={`flex items-center border-b border-gray-200 ${s.outer} ${isMobile ? 'tab-mask' : ''}`}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`inline-flex items-center gap-1.5 transition-all border-b-2 -mb-[2px] font-semibold ${s.button} ${
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
      </>
    )
  }

  // inset — 栏在容器内，tab 栏本身带卡片背景
  return (
    <>
      {isMobile && <MaskStyle />}
      <div className={`bg-white rounded-xl ${isMobile ? 'px-3' : 'px-5'}`}>
        <div className={`flex ${size === 'pc' ? 'gap-6' : 'gap-1 overflow-x-auto hide-scrollbar tab-mask'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 font-medium border-b-2 transition-all ${
                isMobile ? `whitespace-nowrap ${s.button}` : 'py-4 text-sm'
              } ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/Tab/index.tsx
git commit -m "feat: add responsive three-tier layout to TabBar

PC / landscape mobile / portrait mobile sizes.
Internal detection via useIsMobile + orientation media query.
Mobile: horizontal scroll + right-edge CSS mask gradient.
Insets variant also gains responsive scroll support.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Migrate settings page inline tabs to TabBar

**Files:**
- Modify: `app/dashboard/settings/page.tsx` (lines 1-96)

- [ ] **Step 1: Replace settings page content**

Replace the entire file content:

```tsx
'use client'

import { useState, Suspense } from 'react'
import { NotificationConfig } from '@/lib/api/notification'
import NotificationTab from '@/components/settings/NotificationTab'
import AIConfigTab from '@/components/settings/AIConfigTab'
import { TabBar } from '@/components/ui/Tab'
import { useTabRouting } from '@/hooks/useTabRouting'
import { useIsMobile } from '@/hooks/useIsMobile'

type MainTabType = 'ai-config' | 'notification'

const MAIN_TABS = [
  { key: 'ai-config' as const, label: 'AI 配置', icon: '🤖' },
  { key: 'notification' as const, label: '通知渠道', icon: '🔔' },
]

function SettingsPageContent() {
  const [activeMainTab, setActiveMainTab] = useTabRouting<MainTabType>(
    ['ai-config', 'notification'] as const,
    'ai-config'
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<NotificationConfig | null>(null)
  const [webhookInput, setWebhookInput] = useState('')
  const [isActiveInput, setIsActiveInput] = useState(true)
  const isMobile = useIsMobile()

  const openDrawer = (config?: NotificationConfig) => {
    if (config) {
      setEditingConfig(config)
      setWebhookInput(config.webhook)
      setIsActiveInput(config.is_active)
    } else {
      setEditingConfig(null)
      setWebhookInput('')
      setIsActiveInput(true)
    }
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingConfig(null)
    setWebhookInput('')
    setIsActiveInput(true)
  }

  return (
    <div className="space-y-5">
      <TabBar
        tabs={MAIN_TABS}
        activeTab={activeMainTab}
        onTabChange={(key) => setActiveMainTab(key as MainTabType)}
        variant="overline"
      />

      {/* AI 配置 Tab 内容 */}
      {activeMainTab === 'ai-config' && <AIConfigTab isMobile={isMobile} />}

      {/* 通知渠道 Tab 内容 */}
      {activeMainTab === 'notification' && (
        <NotificationTab
          isMobile={isMobile}
          editingConfig={editingConfig}
          setEditingConfig={setEditingConfig}
          webhookInput={webhookInput}
          setWebhookInput={setWebhookInput}
          isActiveInput={isActiveInput}
          setIsActiveInput={setIsActiveInput}
          drawerOpen={drawerOpen}
          openDrawer={openDrawer}
          closeDrawer={closeDrawer}
        />
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>}>
      <SettingsPageContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "refactor: settings page uses TabBar component

Replace inline tab bar markup with <TabBar variant=\"overline\">.
Remove redundant type annotation on MAIN_TABS.
Preserve useIsMobile() for child component props.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: TypeScript check and verification

**Files:**
- (no file changes — verification only)

- [ ] **Step 1: Run TypeScript type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Exit code 0, no errors.

- [ ] **Step 2: Verify all pages still import TabBar correctly**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Confirm no errors related to:
- `components/ui/Tab` imports
- `TabBar` prop types
- Missing exports

- [ ] **Step 3: Commit (if any fixes were needed)**

If the type check required fixes, commit them. Otherwise skip this step.
