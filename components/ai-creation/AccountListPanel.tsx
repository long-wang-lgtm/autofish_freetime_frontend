'use client'

import React from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export type AccountStatus = 'idle' | 'running' | 'completed' | 'failed'

export interface AccountItem {
  uid: string
  name: string
  status: AccountStatus
  /** 可选：封面缩略图base64 */
  thumbnail?: string
}

interface AccountListPanelProps {
  accounts: AccountItem[]
  selectedUid: string | 'all'
  onSelect: (uid: string | 'all') => void
}

function StatusIcon({ status }: { status: AccountStatus }) {
  switch (status) {
    case 'idle':
      return <span className="text-gray-400">○</span>
    case 'running':
      return <LoadingSpinner size="sm" className="text-blue-600" />
    case 'completed':
      return <span className="text-green-600">✅</span>
    case 'failed':
      return <span className="text-red-600">❌</span>
  }
}

export function AccountListPanel({ accounts, selectedUid, onSelect }: AccountListPanelProps) {
  return (
    <div className="py-2">
      {/* 全部Tab */}
      <button
        onClick={() => onSelect('all')}
        className={`w-full px-3 py-3 text-left flex items-center gap-2 border-b border-gray-100 transition-colors ${
          selectedUid === 'all'
            ? 'bg-blue-50 border-l-4 border-l-blue-600'
            : 'hover:bg-gray-50 border-l-4 border-l-transparent'
        }`}
      >
        <span className="text-sm font-medium text-gray-700">全部</span>
        <span className="text-xs text-gray-400">({accounts.length})</span>
      </button>

      {/* 账号列表 */}
      {accounts.map(account => (
        <button
          key={account.uid}
          onClick={() => onSelect(account.uid)}
          className={`w-full px-3 py-3 text-left flex items-center gap-2 border-b border-gray-100 transition-colors ${
            selectedUid === account.uid
              ? 'bg-blue-50 border-l-4 border-l-blue-600'
              : 'hover:bg-gray-50 border-l-4 border-l-transparent'
          }`}
        >
          {account.thumbnail ? (
            <img
              src={`data:image/png;base64,${account.thumbnail}`}
              className="w-10 h-10 rounded object-cover shrink-0"
              alt=""
            />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
              <StatusIcon status={account.status} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-700 truncate">
              {account.name || account.uid}
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <StatusIcon status={account.status} />
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
