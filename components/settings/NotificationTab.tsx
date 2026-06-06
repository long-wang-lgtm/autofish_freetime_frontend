'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listNotificationConfigs,
  createNotificationConfig,
  updateNotificationConfig,
  deleteNotificationConfig,
  NotificationConfig,
} from '@/lib/api/notification'

interface NotificationTabProps {
  editingConfig: NotificationConfig | null
  setEditingConfig: (config: NotificationConfig | null) => void
  webhookInput: string
  setWebhookInput: (value: string) => void
  isActiveInput: boolean
  setIsActiveInput: (value: boolean) => void
  drawerOpen: boolean
  openDrawer: (config?: NotificationConfig) => void
  closeDrawer: () => void
}

export default function NotificationTab({
  editingConfig,
  setEditingConfig,
  webhookInput,
  setWebhookInput,
  isActiveInput,
  setIsActiveInput,
  drawerOpen,
  openDrawer,
  closeDrawer,
}: NotificationTabProps) {
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { data: notificationData, isLoading: notificationLoading } = useQuery({
    queryKey: ['notification-configs'],
    queryFn: listNotificationConfigs,
  })

  const notificationMutation = useMutation({
    mutationFn: async (data: { type: 'create' | 'update' | 'delete', payload?: any }) => {
      if (data.type === 'create') return createNotificationConfig(data.payload)
      if (data.type === 'update') return updateNotificationConfig(data.payload)
      await deleteNotificationConfig(data.payload.id)
      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-configs'] })
      closeDrawer()
      setEditingConfig(null)
      setWebhookInput('')
      setIsActiveInput(true)
    },
  })

  const handleNotificationDelete = (id: number) => {
    notificationMutation.mutate({ type: 'delete', payload: { id } })
  }

  const handleSave = () => {
    if (editingConfig) {
      notificationMutation.mutate({
        type: 'update',
        payload: { id: editingConfig.id, webhook: webhookInput, provider: 'lark', is_active: isActiveInput },
      })
    } else {
      notificationMutation.mutate({
        type: 'create',
        payload: { webhook: webhookInput, provider: 'lark', is_active: isActiveInput },
      })
    }
  }

  const copyJsonMessage = () => {
    const json = {
      level: "",
      title: "",
      session: "",
      order: "",
      content: ""
    }
    navigator.clipboard.writeText(JSON.stringify(json, null, 2))
  }

  const config = notificationData?.[0]

  return (
    <>
      {/* 飞书通知渠道卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6">
          {notificationLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-3xl">🔔</div>
                <div>
                  <div className="font-medium text-gray-900">飞书通知</div>
                  <div className="text-sm text-gray-500 truncate max-w-md">
                    {config?.webhook || '未配置'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* is_active 开关 */}
                {config && (
                  <button
                    onClick={() => notificationMutation.mutate({
                      type: 'update',
                      payload: { id: config.id, webhook: config.webhook, provider: 'lark', is_active: !config.is_active },
                    })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      config.is_active ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        config.is_active ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                )}
                <button
                  onClick={() => openDrawer(config)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  配置
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 侧边抽屉 - 宽度 500px */}
      {drawerOpen && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closeDrawer}
          />
          {/* 抽屉 */}
          <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">飞书通知配置</h3>
              <button
                onClick={closeDrawer}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* webhook 输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  飞书 Webhook 地址
                </label>
                <input
                  type="text"
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                  placeholder="请输入飞书机器人 Webhook 地址"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                />
              </div>
              {/* is_active 开关 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">启用通知</div>
                  <div className="text-xs text-gray-500">关闭后将不会发送通知</div>
                </div>
                <button
                  onClick={() => setIsActiveInput(!isActiveInput)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isActiveInput ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      isActiveInput ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              {/* 复制 JSON 按钮 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  消息 JSON 模板
                </label>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 overflow-x-auto mb-3">{`{
    "level": "",
    "title": "",
    "session": "",
    "order": "",
    "content": ""
}`}</pre>
                <button
                  onClick={copyJsonMessage}
                  className="w-full px-4 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  复制 JSON 消息
                </button>
              </div>
            </div>
            {/* 底部保存按钮 */}
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={notificationMutation.isPending || !webhookInput.trim()}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {notificationMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}