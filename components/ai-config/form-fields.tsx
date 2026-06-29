'use client'

import { ProviderDefaults } from '@/lib/api/ai-config'

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

export interface AIConfigFormFieldsProps {
  /** 表单值 */
  name: string
  provider: string
  configType: 'text' | 'image'
  baseUrl: string
  apiKey: string
  model: string
  isDefault: boolean
  /** 值变更回调 */
  onNameChange: (v: string) => void
  onProviderChange: (v: string) => void
  onConfigTypeChange: (v: 'text' | 'image') => void
  onBaseUrlChange: (v: string) => void
  onApiKeyChange: (v: string) => void
  onModelChange: (v: string) => void
  onIsDefaultChange: (v: boolean) => void
  /** 服务商默认 Base URL 映射 */
  providerDefaults: ProviderDefaults
  /** 复选框 ID 前缀（避免桌面端/移动端 ID 冲突） */
  idPrefix?: string
}

export function AIConfigFormFields({
  name,
  provider,
  configType,
  baseUrl,
  apiKey,
  model,
  isDefault,
  onNameChange,
  onProviderChange,
  onConfigTypeChange,
  onBaseUrlChange,
  onApiKeyChange,
  onModelChange,
  onIsDefaultChange,
  providerDefaults,
  idPrefix = '',
}: AIConfigFormFieldsProps) {
  return (
    <>
      {/* 名称 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          placeholder="例如：我的DeepSeek文字模型"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
      </div>

      {/* 服务商 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">服务商</label>
        <select
          value={provider}
          onChange={(e) => onProviderChange(e.target.value)}
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
                name={`${idPrefix}formConfigType`}
                value={type.value}
                checked={configType === type.value}
                onChange={(e) => onConfigTypeChange(e.target.value as 'text' | 'image')}
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
          value={baseUrl}
          onChange={(e) => onBaseUrlChange(e.target.value)}
          required
          placeholder="https://api.example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
        {providerDefaults[provider] && (
          <p className="mt-1 text-xs text-gray-400">默认值：{providerDefaults[provider]}</p>
        )}
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
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
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          required
          placeholder="例如：deepseek-chat、flux-quick"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
      </div>

      {/* 设为默认 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`${idPrefix}formIsDefault`}
          checked={isDefault}
          onChange={(e) => onIsDefaultChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
        />
        <label htmlFor={`${idPrefix}formIsDefault`} className="text-sm text-gray-700 cursor-pointer">
          设为该用途的默认模型
        </label>
      </div>
    </>
  )
}
