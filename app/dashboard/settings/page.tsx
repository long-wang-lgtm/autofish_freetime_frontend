'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { listAIConfigs, deleteAIConfig, setDefaultAIConfig, AIConfig } from '@/lib/api/ai-config'
import {
  listNotificationConfigs,
  createNotificationConfig,
  updateNotificationConfig,
  deleteNotificationConfig,
  NotificationConfig,
} from '@/lib/api/notification'

type MainTabType = 'ai-config' | 'notification'
type SubTabType = 'all' | 'text' | 'image'

const MAIN_TABS: { key: MainTabType; label: string; icon: string }[] = [
  { key: 'ai-config', label: 'AI 配置', icon: '🤖' },
  { key: 'notification', label: '通知渠道', icon: '🔔' },
]

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek',
  siliconflow: '硅基流动',
  volcano: '火山方舟',
  bailian: '阿里百炼',
}

const CONFIG_TYPE_LABELS: Record<string, string> = {
  text: '文字',
  image: '生图',
}

export default function SettingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('ai-config')
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<NotificationConfig | null>(null)
  const [webhookInput, setWebhookInput] = useState('')
  const [isActiveInput, setIsActiveInput] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['ai-configs'],
    queryFn: listAIConfigs,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAIConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      setDeleteConfirm(null)
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultAIConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
    },
  })

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
      setDrawerOpen(false)
      setEditingConfig(null)
      setWebhookInput('')
      setIsActiveInput(true)
    },
  })

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

  const handleNotificationDelete = (id: number) => {
    notificationMutation.mutate({ type: 'delete', payload: { id } })
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

  const filteredConfigs = data?.configs.filter((config) => {
    if (activeSubTab === 'all') return true
    return config.config_type === activeSubTab
  }) || []

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id)
  }

  const handleSetDefault = async (id: number) => {
    await setDefaultMutation.mutateAsync(id)
  }

  return (
    <div className="space-y-5">
      {/* 页面标题 */}
      {/* <h1 className="text-2xl font-bold text-gray-900">设置</h1> */}

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
      {activeMainTab === 'ai-config' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 工具栏 */}
          <div className="flex items-center gap-3 px-6 pt-4 pb-3 border-b border-gray-100">
            {(['all', 'text', 'image'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeSubTab === tab
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {tab === 'all' ? '全部' : tab === 'text' ? '文字模型' : '生图模型'}
              </button>
            ))}
            <button
              onClick={() => router.push('/dashboard/settings/add')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              添加模型
            </button>
          </div>

          {/* 数据区 */}
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无 AI 模型</h3>
              <p className="text-sm text-gray-500 mb-4">点击上方按钮添加您的第一个 AI 模型</p>
              <button
                onClick={() => router.push('/dashboard/settings/add')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                添加模型
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">服务商</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用途</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">模型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">默认</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{config.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {PROVIDER_LABELS[config.provider] || config.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        config.config_type === 'text' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {CONFIG_TYPE_LABELS[config.config_type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{config.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {config.is_active ? (
                        <span className="text-green-600">✓ 默认</span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(config.id)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="设为默认"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => router.push(`/dashboard/settings/${config.id}`)}
                        className="text-blue-600 hover:text-blue-800 mr-4 transition-colors"
                      >
                        编辑
                      </button>
                      {deleteConfirm === config.id ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? '删除中...' : '确认'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(config.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 通知渠道 Tab 内容 */}
      {activeMainTab === 'notification' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 飞书通知渠道卡片 */}
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
                      {notificationData?.configs[0]?.webhook || '未配置'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* is_active 开关 */}
                  {notificationData?.configs[0] && (
                    <button
                      onClick={() => notificationMutation.mutate({
                        type: 'update',
                        payload: { id: notificationData.configs[0].id, webhook: notificationData.configs[0].webhook, provider: 'lark', is_active: !notificationData.configs[0].is_active },
                      })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notificationData.configs[0].is_active ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          notificationData.configs[0].is_active ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  )}
                  <button
                    onClick={() => openDrawer(notificationData?.configs[0] || undefined)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    配置
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  )
}
