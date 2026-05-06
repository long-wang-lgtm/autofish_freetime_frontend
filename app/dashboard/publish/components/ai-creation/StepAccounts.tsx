'use client'

import { useState } from 'react'
import { listAccounts, Account } from '@/lib/api/accounts'

interface StepAccountsProps {
  onNext: (desc: string, accounts: Array<{ uid: string; name: string }>) => void
}

export default function StepAccounts({ onNext }: StepAccountsProps) {
  const [description, setDescription] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [accounts, setAccounts] = useState<Account[]>([])

  // Load accounts on mount
  useState(() => {
    listAccounts().then(res => setAccounts(res.accounts))
  })

  const toggleAccount = (uid: string) => {
    const next = new Set(selectedAccounts)
    if (next.has(uid)) {
      next.delete(uid)
    } else {
      if (next.size < 10) {
        next.add(uid)
      }
    }
    setSelectedAccounts(next)
  }

  const handleNext = () => {
    if (!description.trim()) {
      alert('请输入商品描述')
      return
    }
    if (selectedAccounts.size === 0) {
      alert('请选择至少一个账号')
      return
    }
    const selected = accounts
      .filter(acc => selectedAccounts.has(acc.uid))
      .map(acc => ({ uid: acc.uid, name: acc.name }))
    onNext(description, selected)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">第一步：输入商品描述</h2>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="请粘贴原始商品描述..."
          className="w-full h-40 p-4 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          第二步：选择发布账号
          <span className="text-sm font-normal text-gray-500 ml-2">
            (已选 {selectedAccounts.size} 个，最多10个)
          </span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {accounts.map(acc => (
            <button
              key={acc.uid}
              onClick={() => toggleAccount(acc.uid)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedAccounts.has(acc.uid)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900 truncate">{acc.name}</div>
              <div className="text-xs text-gray-500 mt-1">@{acc.uid}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={handleNext}
          disabled={!description.trim() || selectedAccounts.size === 0}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          开始AI改写 →
        </button>
      </div>
    </div>
  )
}
