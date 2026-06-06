'use client'

import { useState } from 'react'
import { NotificationConfig } from '@/lib/api/notification'
import NotificationTab from '@/components/settings/NotificationTab'
import AIConfigTab from '@/components/settings/AIConfigTab'

type MainTabType = 'ai-config' | 'notification'

const MAIN_TABS: { key: MainTabType; label: string; icon: string }[] = [
  { key: 'ai-config', label: 'AI 配置', icon: '🤖' },
  { key: 'notification', label: '通知渠道', icon: '🔔' },
]

export default function SettingsPage() {
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('ai-config')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<NotificationConfig | null>(null)
  const [webhookInput, setWebhookInput] = useState('')
  const [isActiveInput, setIsActiveInput] = useState(true)

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
      {/* 一级 Tab 栏 - 左上角 */}
      <div className="flex items-center gap-0 border-b border-gray-200">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveMainTab(tab.key)}
            className={`px-5 py-3 text-base font-semibold transition-all border-b-2 -mb-[2px] ${
              activeMainTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* AI 配置 Tab 内容 */}
      {activeMainTab === 'ai-config' && <AIConfigTab />}

      {/* 通知渠道 Tab 内容 */}
      {activeMainTab === 'notification' && (
        <NotificationTab
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