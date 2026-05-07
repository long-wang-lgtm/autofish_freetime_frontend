'use client'

import React, { useState } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Account {
  uid: string
  name: string
  status: number
}

interface Step1AccountProps {
  accounts: Account[]
  onStart: (description: string, accountUids: string[]) => void
}

export function Step1Account({ accounts, onStart }: Step1AccountProps) {
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleAccount = (uid: string) => {
    const next = new Set(selected)
    if (next.has(uid)) next.delete(uid)
    else next.add(uid)
    setSelected(next)
  }

  const handleSubmit = async () => {
    if (!description.trim() || selected.size === 0) return
    if (selected.size > 10) {
      alert('最多选择10个账号')
      return
    }
    setIsSubmitting(true)
    try {
      onStart(description, Array.from(selected))
    } catch (err) {
      alert('提交失败: ' + String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 原始描述输入 */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">粘贴商品原始描述</h3>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="请粘贴要改写的商品描述，AI将为每个账号生成不同的改写版本..."
          rows={8}
          className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
        />
      </div>

      {/* 账号选择 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">选择发布账号</h3>
          <span className="text-sm text-gray-500">
            已选 {selected.size} 个 {selected.size > 0 && `（将生成 ${selected.size} 份不同内容）`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {accounts.map((acc) => (
            <button
              key={acc.uid}
              onClick={() => toggleAccount(acc.uid)}
              disabled={isSubmitting}
              className={`p-4 rounded-xl text-left transition-all ${
                selected.has(acc.uid)
                  ? 'bg-blue-50 border-2 border-blue-400 text-blue-700'
                  : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:border-gray-300'
              } disabled:opacity-50`}
            >
              <div className="font-medium">{acc.name || acc.uid}</div>
              <div className="text-xs text-gray-400 mt-1">
                {acc.status === 1 ? '✅ 正常' : '⚠️ 异常'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 开始按钮 */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !description.trim() || selected.size === 0}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
      >
        {isSubmitting ? (
          <><LoadingSpinner size="sm" /> 提交中...</>
        ) : (
          <>🚀 开始AI改写（{selected.size}份）</>
        )}
      </button>
    </div>
  )
}
