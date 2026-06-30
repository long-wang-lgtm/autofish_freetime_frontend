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
    <div className="flex flex-col gap-5 h-full">
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
