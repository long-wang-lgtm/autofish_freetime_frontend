'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Sheet, BottomSheet } from '@/components/ui/Sheet'
import { AIConfigFormFields } from '@/components/ai-config/form-fields'
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

interface AIConfigTabProps {
  isMobile: boolean
}

export default function AIConfigTab({ isMobile }: AIConfigTabProps) {
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
        <div className={`flex items-center border-b border-gray-100 ${
          isMobile ? 'gap-1.5 px-2 pt-3 pb-2' : 'gap-3 px-6 pt-4 pb-3'
        }`}>
          {(['all', 'text', 'image'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`font-medium rounded-lg transition-all ${
                isMobile ? 'px-2.5 py-1 text-sm' : 'px-4 py-2 text-sm'
              } ${
                activeSubTab === tab
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {tab === 'all' ? '全部' : tab === 'text' ? '文字' : '生图'}
            </button>
          ))}
          <span className="flex-1" />
          <button
            onClick={() => openDrawer()}
            title="每个ai模型调用方法不一致，添加模型后若不可用，请联系作者！后续添加模型连接测试功能"
            className={`bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center flex-shrink-0 ${
              isMobile ? 'px-2.5 py-1 text-sm gap-1' : 'px-4 py-2 gap-2'
            }`}
          >
            <svg className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {isMobile ? '添加' : '添加模型'}
          </button>
        </div>

        {/* 数据区 */}
        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : filteredConfigs.length === 0 ? (
          <div className="p-6 text-center">
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
        ) : isMobile ? (
          // 移动端卡片列表
          <div className="flex-1 overflow-y-auto px-1 py-2 space-y-2">
            {filteredConfigs.map((config) => (
              <div key={config.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* 标题行 */}
                <div className="flex items-start justify-between px-3 pt-3 pb-1 gap-2">
                  <span className="text-sm font-semibold text-gray-900 leading-tight truncate flex-1 min-w-0">
                    {config.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                    config.config_type === 'text' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {CONFIG_TYPE_LABELS[config.config_type]}
                  </span>
                </div>
                {/* 信息行 */}
                <div className="px-3 pb-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <span>{PROVIDER_LABELS[config.provider] || config.provider}</span>
                  <span className="text-gray-300">·</span>
                  <span className="font-mono">{config.model}</span>
                </div>
                {/* 默认状态 */}
                <div className="px-3 pb-2 text-xs">
                  {config.is_active ? (
                    <span className="text-green-600">✓ 默认模型</span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(config.id)}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      设为默认
                    </button>
                  )}
                </div>
                {/* 底部操作 */}
                <div className="flex items-center justify-end gap-1 px-3 py-2 border-t border-gray-100">
                  <button
                    onClick={() => handleCopy(config)}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600"
                  >
                    复制
                  </button>
                  {deleteConfirm === config.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(config.id)}
                        disabled={deleteMutation.isPending}
                        className="px-2 py-1 text-xs text-red-600"
                      >
                        {deleteMutation.isPending ? '...' : '确认'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-xs text-gray-400"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => openDrawer(config)}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(config.id)}
                        className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
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

      {/* 抽屉 — 桌面侧边 / 移动端底部 */}
      {isMobile ? (
        <BottomSheet
          open={drawerOpen}
          onClose={closeDrawer}
          title={editingConfig ? '编辑 AI 模型' : '添加 AI 模型'}
          footer={
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {saveMutation.isPending ? '保存中...' : '保存'}
              </button>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex-1 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                取消
              </button>
            </div>
          }
        >
          <div className="p-5 space-y-4">
            <AIConfigFormFields
              name={formName}
              provider={formProvider}
              configType={formConfigType}
              baseUrl={formBaseUrl}
              apiKey={formApiKey}
              model={formModel}
              isDefault={formIsDefault}
              onNameChange={setFormName}
              onProviderChange={(v) => {
                setFormProvider(v)
                if (providerDefaults[v]) setFormBaseUrl(providerDefaults[v])
              }}
              onConfigTypeChange={setFormConfigType}
              onBaseUrlChange={setFormBaseUrl}
              onApiKeyChange={setFormApiKey}
              onModelChange={setFormModel}
              onIsDefaultChange={setFormIsDefault}
              providerDefaults={providerDefaults}
              idPrefix="mobile-"
            />
          </div>
        </BottomSheet>
      ) : (
        <Sheet
          open={drawerOpen}
          onClose={closeDrawer}
          title={editingConfig ? '编辑 AI 模型' : '添加 AI 模型'}
          width="500px"
        >
          <form onSubmit={handleSubmit} className="h-full overflow-y-auto p-6 space-y-6">
            <AIConfigFormFields
              name={formName}
              provider={formProvider}
              configType={formConfigType}
              baseUrl={formBaseUrl}
              apiKey={formApiKey}
              model={formModel}
              isDefault={formIsDefault}
              onNameChange={setFormName}
              onProviderChange={(v) => {
                setFormProvider(v)
                if (providerDefaults[v]) setFormBaseUrl(providerDefaults[v])
              }}
              onConfigTypeChange={setFormConfigType}
              onBaseUrlChange={setFormBaseUrl}
              onApiKeyChange={setFormApiKey}
              onModelChange={setFormModel}
              onIsDefaultChange={setFormIsDefault}
              providerDefaults={providerDefaults}
            />
            {/* 底部按钮 */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <button type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saveMutation.isPending ? '保存中...' : '保存'}
              </button>
              <button type="button" onClick={closeDrawer} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">取消</button>
            </div>
          </form>
        </Sheet>
      )}
    </>
  )
}