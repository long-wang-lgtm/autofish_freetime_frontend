'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { listAIConfigs, deleteAIConfig, setDefaultAIConfig, AIConfig } from '@/lib/api/ai-config'

type TabType = 'all' | 'text' | 'image'

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
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

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

  const filteredConfigs = data?.configs.filter((config) => {
    if (activeTab === 'all') return true
    return config.config_type === activeTab
  }) || []

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id)
  }

  const handleSetDefault = async (id: number) => {
    await setDefaultMutation.mutateAsync(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 配置</h1>
          <p className="text-sm text-gray-500 mt-1">管理您的 AI 模型配置</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/settings/add')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          添加配置
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
        {(['all', 'text', 'image'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'all' ? '全部' : tab === 'text' ? '文字模型' : '生图模型'}
          </button>
        ))}
      </div>

      {/* 表格 */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : filteredConfigs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无 AI 配置</h3>
          <p className="text-sm text-gray-500 mb-4">点击上方按钮添加您的第一个 AI 模型配置</p>
          <button
            onClick={() => router.push('/dashboard/settings/add')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            添加配置
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
        </div>
      )}
    </div>
  )
}
