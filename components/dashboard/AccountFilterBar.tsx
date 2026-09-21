'use client'

import { RefreshCw } from 'lucide-react'

interface AccountFilterBarProps {
  accounts: { uid: string; name: string }[]
  /** 选中的账号 uid；null 表示全选 */
  selected: string[] | null
  onChange: (next: string[] | null) => void
  onRefresh: () => void
  loading?: boolean
}

const PILL_BASE =
  'h-10 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0'
const PILL_ON =
  'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
const PILL_OFF =
  'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'

/** 账号筛选——pill 多选，"全部"等价于 selected 为 null */
export function AccountFilterBar({
  accounts,
  selected,
  onChange,
  onRefresh,
  loading = false,
}: AccountFilterBarProps) {
  const activeUids = selected ?? accounts.map((a) => a.uid)
  const activeSet = new Set(activeUids)
  const allActive = selected === null

  function toggle(uid: string) {
    const next = new Set(activeUids)
    if (next.has(uid)) {
      next.delete(uid)
    } else {
      next.add(uid)
    }
    const picked = accounts.filter((a) => next.has(a.uid)).map((a) => a.uid)
    // 全选归一化成 null，避免"全部"与"逐个选中所有"两种等价状态
    onChange(picked.length === accounts.length ? null : picked)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
          账号
        </span>
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-pressed={allActive}
            className={`${PILL_BASE} ${allActive ? PILL_ON : PILL_OFF}`}
          >
            全部
          </button>
          {accounts.map((a) => (
            <button
              key={a.uid}
              type="button"
              onClick={() => toggle(a.uid)}
              aria-pressed={activeSet.has(a.uid)}
              className={`${PILL_BASE} ${activeSet.has(a.uid) ? PILL_ON : PILL_OFF}`}
            >
              {a.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto h-10 px-4 shrink-0 inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>
    </div>
  )
}
