'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  listAIConfigs,
  deleteAIConfig,
  setDefaultAIConfig,
  createAIConfig,
  updateAIConfig,
  AIConfig,
  AIConfigCreate,
  getProviderDefaults,
  ProviderDefaults,
} from '@/lib/api/ai-config'

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek',
  siliconflow: '硅基流动',
  volcano: '火山方舟',
  bailian: '阿里百炼',
  minimax: 'MiniMax',
}

const CONFIG_TYPE_LABELS: Record<string, string> = {
  text: '文字',
  image: '生图',
}

const PROVIDERS: { value: string; label: string }[] = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'siliconflow', label: '硅基流动' },
  { value: 'volcano', label: '火山方舟' },
  { value: 'bailian', label: '阿里百炼' },
  { value: 'minimax', label: 'MiniMax' },
]

const CONFIG_TYPES: { value: 'text' | 'image'; label: string }[] = [
  { value: 'text', label: '文字模型' },
  { value: 'image', label: '生图模型' },
]

interface AIConfigTabProps {
  // 可以接收外部控制的抽屉状态（可选）
}

export default function AIConfigTab() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // 子 tab 状态
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'text' | 'image'>('all')

  // 删除确认状态
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // 抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AIConfig | null>(null)

  // 抽屉表单状态
  const [formName, setFormName] = useState('')
  const [formProvider, setFormProvider] = useState<string>('deepseek')
  const [formConfigType, setFormConfigType] = useState<'text' | 'image'>('text')
  const [formBaseUrl, setFormBaseUrl] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [providerDefaults, setProviderDefaults] = useState<ProviderDefaults>({})

  // 获取数据
  const { data, isLoading } = useQuery({
    queryKey: ['ai-configs'],
    queryFn: listAIConfigs,
  })

  // 获取 provider 默认值
  useState(() => {
    getProviderDefaults().then(setProviderDefaults)
  })

  // 删除 mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAIConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      setDeleteConfirm(null)
    },
  })

  // 设置默认 mutation
  const setDefaultMutation = useMutation({
    mutationFn: setDefaultAIConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
    },
  })

  // 创建/更新 mutation
  const saveMutation = useMutation({
    mutationFn: (data: AIConfigCreate & { id?: number }) => {
      if (data.id) {
        return updateAIConfig(data.id, data)
      }
      return createAIConfig(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      closeDrawer()
    },
  })

  // 过滤配置
  const filteredConfigs = data?.filter((config) => {
    if (activeSubTab === 'all') return true
    return config.config_type === activeSubTab
  }) || []

  // 打开抽屉（新建或编辑）
  const openDrawer = (config?: AIConfig) => {
    if (config) {
      setEditingConfig(config)
      setFormName(config.name)
      setFormProvider(config.provider)
      setFormConfigType(config.config_type)
      setFormBaseUrl(config.base_url)
      setFormApiKey(config.api_key)
      setFormModel(config.model)
      setFormIsDefault(config.is_active)
    } else {
      setEditingConfig(null)
      setFormName('')
      setFormProvider('deepseek')
      setFormConfigType('text')
      setFormBaseUrl(providerDefaults['deepseek'] || '')
      setFormApiKey('')
      setFormModel('')
      setFormIsDefault(false)
    }
    setDrawerOpen(true)
  }

  // 关闭抽屉
  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingConfig(null)
    setFormName('')
    setFormProvider('deepseek')
    setFormConfigType('text')
    setFormBaseUrl('')
    setFormApiKey('')
    setFormModel('')
    setFormIsDefault(false)
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: formName,
      provider: formProvider as any,
      config_type: formConfigType,
      api_key: formApiKey,
      base_url: formBaseUrl,
      model: formModel,
      is_active: formIsDefault,
      ...(editingConfig ? { id: editingConfig.id } : {}),
    }
    await saveMutation.mutateAsync(payload as any)
  }

  // 处理删除
  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id)
  }

  // 处理设为默认
  const handleSetDefault = async (id: number) => {
    await setDefaultMutation.mutateAsync(id)
  }

  // 复制配置（不复制默认开关）
  const handleCopy = (config: AIConfig) => {
    setEditingConfig(null)
    setFormName(`${config.name} (副本)`)
    setFormProvider(config.provider)
    setFormConfigType(config.config_type)
    setFormBaseUrl(config.base_url)
    setFormApiKey(config.api_key)
    setFormModel(config.model)
    setFormIsDefault(false) // 不复制默认开关
    setDrawerOpen(true)
  }

  return (
    <>
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
            onClick={() => openDrawer()}
            title="每个ai模型调用方法不一致，添加模型后若不可用，请联系作者！后续添加模型连接测试功能"
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
              onClick={() => openDrawer()}
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
                      onClick={() => handleCopy(config)}
                      className="text-gray-400 hover:text-blue-600 mr-4 transition-colors"
                    >
                      复制
                    </button>
                    <button
                      onClick={() => openDrawer(config)}
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
              <h3 className="text-lg font-semibold text-gray-900">
                {editingConfig ? '编辑 AI 模型' : '添加 AI 模型'}
              </h3>
              <button
                onClick={closeDrawer}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="例如：我的DeepSeek文字模型"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* 服务商 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务商</label>
                <select
                  value={formProvider}
                  onChange={(e) => {
                    setFormProvider(e.target.value)
                    if (providerDefaults[e.target.value]) {
                      setFormBaseUrl(providerDefaults[e.target.value])
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* 用途 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用途</label>
                <div className="flex gap-4">
                  {CONFIG_TYPES.map((type) => (
                    <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="formConfigType"
                        value={type.value}
                        checked={formConfigType === type.value}
                        onChange={(e) => setFormConfigType(e.target.value as 'text' | 'image')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  type="text"
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                  required
                  placeholder="https://api.example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                {providerDefaults[formProvider] && (
                  <p className="mt-1 text-xs text-gray-400">
                    默认值：{providerDefaults[formProvider]}
                  </p>
                )}
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  required
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* 模型名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
                <input
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  required
                  placeholder="例如：deepseek-chat、flux-quick"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* 设为默认 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="formIsDefault"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <label htmlFor="formIsDefault" className="text-sm text-gray-700 cursor-pointer">
                  设为该用途的默认模型
                </label>
              </div>

              {/* 底部按钮 */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveMutation.isPending ? '保存中...' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  )
}