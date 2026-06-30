'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AIConfigCreate, AIConfigUpdate, getProviderDefaults, ProviderDefaults } from '@/lib/api/ai-config'

type ConfigType = 'text' | 'image'
type Provider = 'deepseek' | 'siliconflow' | 'volcano' | 'bailian' | 'minimax'

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'siliconflow', label: '硅基流动' },
  { value: 'volcano', label: '火山方舟' },
  { value: 'bailian', label: '阿里百炼' },
  { value: 'minimax', label: 'MiniMax' },
]

const CONFIG_TYPES: { value: ConfigType; label: string }[] = [
  { value: 'text', label: '文字模型' },
  { value: 'image', label: '生图模型' },
]

interface AIConfigFormProps {
  initialData?: {
    id: number
    name: string
    config_type: ConfigType
    provider: Provider
    api_key: string
    base_url: string
    model: string
    is_active: boolean
  }
  onSubmit: (data: AIConfigCreate | AIConfigUpdate) => Promise<void>
  isLoading?: boolean
}

export function AIConfigForm({ initialData, onSubmit, isLoading }: AIConfigFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialData?.name || '')
  const [provider, setProvider] = useState<Provider>(initialData?.provider || 'deepseek')
  const [configType, setConfigType] = useState<ConfigType>(initialData?.config_type || 'text')
  const [baseUrl, setBaseUrl] = useState(initialData?.base_url || '')
  const [apiKey, setApiKey] = useState(initialData?.api_key || '')
  const [model, setModel] = useState(initialData?.model || '')
  const [isDefault, setIsDefault] = useState(initialData?.is_active || false)
  const [providerDefaults, setProviderDefaults] = useState<ProviderDefaults>({})

  useEffect(() => {
    getProviderDefaults().then(setProviderDefaults)
  }, [])

  useEffect(() => {
    if (providerDefaults[provider] && !initialData) {
      setBaseUrl(providerDefaults[provider])
    }
  }, [provider, providerDefaults, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      name,
      provider,
      config_type: configType,
      api_key: apiKey,
      base_url: baseUrl,
      model,
      is_active: isDefault,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="例如：我的DeepSeek文字模型"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">服务商</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">用途</label>
        <div className="flex gap-4">
          {CONFIG_TYPES.map((type) => (
            <label key={type.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="configType"
                value={type.value}
                checked={configType === type.value}
                onChange={(e) => setConfigType(e.target.value as ConfigType)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          required
          placeholder="https://api.example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
        {providerDefaults[provider] && (
          <p className="mt-1 text-xs text-gray-400">
            默认值：{providerDefaults[provider]}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
          placeholder="sk-..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
          placeholder="例如：deepseek-chat、flux-quick"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
        />
        <label htmlFor="isDefault" className="text-sm text-gray-700 cursor-pointer">
          设为该用途的默认模型
        </label>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  )
}
