'use client'

import { RefreshCw, X } from 'lucide-react'
import { MultiSelect } from '@/components/ui/data/MultiSelect'

interface AccountFilterBarProps {
  accounts: { uid: string; name: string }[]
  /** 选中的账号 uid；null 表示全不选 ＝ 全量 */
  selected: string[] | null
  onChange: (next: string[] | null) => void
  onRefresh: () => void
  loading?: boolean
}

/**
 * 账号筛选——刷新按钮 + 下拉卡片多选 + 已选账号 chip。
 * 账号多起来时下拉卡片收着，已选账号才展开成 chip 排在下拉右边（放不下就换行）。
 * selected 为 null ＝ 全不选 ＝ 全量；筛选语义与原 pill 版一致。
 */
export function AccountFilterBar({
  accounts,
  selected,
  onChange,
  onRefresh,
  loading = false,
}: AccountFilterBarProps) {
  // 默认（null）不点亮任何账号，只亮下拉里的「全部」
  const activeSet = new Set(selected ?? [])
  const nameOf = new Map(accounts.map((a) => [a.uid, a.name]))

  /** 全选归一化成 null（等价于「全部」）；一个不剩也回到全量，免得筛出空数据 */
  function normalize(picked: string[]): string[] | null {
    return picked.length === 0 || picked.length === accounts.length ? null : picked
  }

  function toggle(uid: string) {
    // 从当前选择起算——默认全不选时点一个账号＝只筛这一个，再点一个＝叠加
    const next = new Set(activeSet)
    if (next.has(uid)) {
      next.delete(uid)
    } else {
      next.add(uid)
    }
    onChange(normalize(accounts.filter((a) => next.has(a.uid)).map((a) => a.uid)))
  }

  function remove(uid: string) {
    onChange(normalize((selected ?? []).filter((u) => u !== uid)))
  }

  return (
    <div className="flex items-start gap-3 max-w-2xl p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="h-10 px-4 shrink-0 inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        刷新
      </button>

      <MultiSelect
        options={accounts.map((a) => ({ value: a.uid, label: a.name }))}
        selected={selected ?? []}
        onToggle={toggle}
        onClear={() => onChange(null)}
        triggerLabel="全部账号"
        searchPlaceholder="搜索账号"
      />

      {/* 已选账号：放不下就换行，chip 上的 × 单独移除 */}
      {(selected ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 min-w-0 pt-1.5">
          {(selected ?? []).map((uid) => (
            <span
              key={uid}
              className="inline-flex items-center gap-1 shrink-0 h-7 pl-2.5 pr-1 rounded-full bg-blue-50 dark:bg-blue-950 text-xs font-medium text-blue-700 dark:text-blue-300"
            >
              {nameOf.get(uid) ?? uid}
              <button
                type="button"
                onClick={() => remove(uid)}
                aria-label={`取消筛选「${nameOf.get(uid) ?? uid}」`}
                className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
