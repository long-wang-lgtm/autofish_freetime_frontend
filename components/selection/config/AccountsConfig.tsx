'use client'

import { useState } from 'react'
import { X, Plus, Search, Building2 } from 'lucide-react'

interface Account {
  id: string
  name: string
  fans: string
}

const INITIAL_ACCOUNTS: Account[] = [
  { id: 'a1', name: '某某数码3C', fans: '1.2w' },
  { id: 'a2', name: '二手苹果专营', fans: '8000' },
  { id: 'a3', name: '小红书同城数码', fans: '3000' },
]

export function AccountsConfig() {
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS)
  const [input, setInput] = useState('')

  const removeAccount = (id: string) => {
    setAccounts(accounts.filter((a) => a.id !== id))
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">对标账号/店铺</h3>

      {/* 搜索区 */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入账号名称搜索..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
          />
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
          <Plus className="w-4 h-4" />
          添加
        </button>
      </div>

      {/* 账号列表 */}
      <div className="space-y-2">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">{acc.name}</div>
                <div className="text-xs text-gray-400">粉丝: {acc.fans}</div>
              </div>
            </div>
            <button
              onClick={() => removeAccount(acc.id)}
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
