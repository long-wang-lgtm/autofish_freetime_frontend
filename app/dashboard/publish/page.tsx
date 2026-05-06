'use client'

import { useState } from 'react'
import AICreationTab from './components/ai-creation/AICreationTab'

export default function PublishPage() {
  const [activeTab, setActiveTab] = useState<'publish' | 'draft' | 'ai'>('ai')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">商品发布</h1>
        <p className="text-sm text-gray-500 mt-1">
          发布和管理您的闲鱼商品
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
        <button
          onClick={() => setActiveTab('publish')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'publish'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          发布商品
        </button>
        <button
          onClick={() => setActiveTab('draft')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'draft'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          草稿箱
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'ai'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          AI创作
        </button>
      </div>

      {/* 内容区域 */}
      {activeTab === 'ai' && <AICreationTab />}

      {/* 内容区域 */}
      {activeTab === 'publish' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">商品发布功能</h3>
          <p className="text-sm text-gray-500">商品发布页面开发中...</p>
        </div>
      )}

      {activeTab === 'draft' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">草稿箱</h3>
          <p className="text-sm text-gray-500">暂无草稿</p>
        </div>
      )}
    </div>
  )
}