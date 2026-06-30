'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sheet, BottomSheet } from '@/components/ui/Sheet'
import {
  listNotificationConfigs,
  createNotificationConfig,
  updateNotificationConfig,
  deleteNotificationConfig,
  NotificationConfig,
} from '@/lib/api/notification'

interface NotificationTabProps {
  isMobile: boolean
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
  isMobile,
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
        <div className={isMobile ? 'p-3' : 'p-6'}>
          {notificationLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : (
            <div className={`flex items-center justify-between ${
              isMobile ? 'gap-1.5' : 'gap-4'
            }`}>
              <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-4'} flex-1 min-w-0`}>
                <div className={`${isMobile ? 'text-xl' : 'text-3xl'} flex-shrink-0`}>🔔</div>
                <div className="min-w-0 flex-1">
                  <div className={`font-medium text-gray-900 ${isMobile ? 'text-xs' : ''}`}>飞书通知</div>
                  <div className={`text-gray-500 truncate ${isMobile ? 'text-xs max-w-[140px]' : 'text-sm max-w-md'}`}>
                    {config?.webhook || '未配置'}
                  </div>
                </div>
              </div>
              <div className={`flex items-center ${isMobile ? 'gap-1.5 flex-shrink-0' : 'gap-4'}`}>
                {/* is_active 开关 */}
                {config && (
                  <button
                    onClick={() => notificationMutation.mutate({
                      type: 'update',
                      payload: { id: config.id, webhook: config.webhook, provider: 'lark', is_active: !config.is_active },
                    })}
                    className={`relative rounded-full transition-colors ${
                      isMobile ? 'w-[34px] h-[18px]' : 'w-12 h-6'
                    } ${config.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute top-1/2 -translate-y-1/2 bg-white rounded-full transition-all ${
                        isMobile ? 'w-[15px] h-[15px]' : 'w-4 h-4'
                      } ${config.is_active ? (isMobile ? 'left-[17px]' : 'left-7') : 'left-0.5'}`}
                    />
                  </button>
                )}
                <button
                  onClick={() => openDrawer(config)}
                  className={`bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium ${
                    isMobile ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'
                  }`}
                >
                  配置
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 抽屉 — 桌面侧边 / 移动端底部 */}
      {isMobile ? (
        <BottomSheet
          open={drawerOpen}
          onClose={closeDrawer}
          title="飞书通知配置"
          footer={
            <button
              onClick={handleSave}
              disabled={notificationMutation.isPending || !webhookInput.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {notificationMutation.isPending ? '保存中...' : '保存'}
            </button>
          }
        >
          <div className="p-5 space-y-5">
            {/* webhook 输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">飞书 Webhook 地址</label>
              <input type="text" value={webhookInput} onChange={(e) => setWebhookInput(e.target.value)} placeholder="请输入飞书机器人 Webhook 地址" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
            </div>
            {/* is_active 开关 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">启用通知</div>
                <div className="text-xs text-gray-500">关闭后将不会发送通知</div>
              </div>
              <button
                onClick={() => setIsActiveInput(!isActiveInput)}
                className={`relative w-12 h-6 rounded-full transition-colors ${isActiveInput ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full transition-all ${isActiveInput ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            {/* 复制 JSON 按钮 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">消息 JSON 模板</label>
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 overflow-x-auto mb-3">{`{
    "level": "",
    "title": "",
    "session": "",
    "order": "",
    "content": ""
}`}</pre>
              <button onClick={copyJsonMessage} className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                复制 JSON 消息
              </button>
            </div>
          </div>
        </BottomSheet>
      ) : (
        <Sheet open={drawerOpen} onClose={closeDrawer} title="飞书通知配置" width="500px">
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">飞书 Webhook 地址</label>
                <input type="text" value={webhookInput} onChange={(e) => setWebhookInput(e.target.value)} placeholder="请输入飞书机器人 Webhook 地址" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">启用通知</div>
                  <div className="text-xs text-gray-500">关闭后将不会发送通知</div>
                </div>
                <button onClick={() => setIsActiveInput(!isActiveInput)} className={`relative w-12 h-6 rounded-full transition-colors ${isActiveInput ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full transition-all ${isActiveInput ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">消息 JSON 模板</label>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 overflow-x-auto mb-3">{`{
    "level": "",
    "title": "",
    "session": "",
    "order": "",
    "content": ""
}`}</pre>
                <button onClick={copyJsonMessage} className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">复制 JSON 消息</button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={handleSave} disabled={notificationMutation.isPending || !webhookInput.trim()} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium">
                {notificationMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  )
}