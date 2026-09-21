'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  /** 已选值；空数组表示一个都没选（语义由调用方定义，通常是「不筛」） */
  selected: string[]
  onToggle: (value: string) => void
  /** 点面板里的清空按钮时触发（＝不筛，回到全量） */
  onClear: () => void
  /** 未选任何项时的触发器文案 */
  triggerLabel: string
  /** 有选中项时的触发器文案，默认「已选 N 个」 */
  countLabel?: (count: number) => string
  /** 搜索框右侧清空按钮的文案 */
  clearLabel?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
}

/** 选项＝可点的小卡片：白底细边框，选中转蓝底蓝框（不用复选框，整块可点）。
 *  文字左对齐 + 右侧省略号——居中时超长名字会两头被切（实测「海绵宝宝去抓水母吧」丢了首字）。 */
const CARD_BASE =
  'h-9 px-2 flex items-center overflow-hidden rounded-lg border text-sm transition-colors'
const CARD_ON =
  'border-blue-300 bg-blue-50 text-blue-700 font-medium dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
const CARD_OFF =
  'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'

/**
 * 多选下拉卡片 —— 触发器 + 卡片面板，面板内的选项是可直接点击的小卡片
 * （不用复选框：小卡片点击区域大、连着点多选更顺手）。
 *
 * 用于「选项可能很多、横向平铺会吃光水平空间」的筛选（如账号筛选）。
 * 选中项由调用方在触发器旁边另行展示（chips），本组件只负责触发器文案与面板。
 */
export function MultiSelect({
  options,
  selected,
  onToggle,
  onClear,
  triggerLabel,
  countLabel = (count) => `已选 ${count} 个`,
  clearLabel = '清空',
  searchPlaceholder = '搜索',
  disabled = false,
  className = '',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  // 点卡片外 / Esc 关闭；关闭不改变已选
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // 关闭时清掉搜索词，下次打开是完整列表
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const activeSet = useMemo(() => new Set(selected), [selected])
  const keyword = query.trim().toLowerCase()
  const filtered = keyword
    ? options.filter((o) => o.label.toLowerCase().includes(keyword))
    : options

  const summary = selected.length === 0 ? triggerLabel : countLabel(selected.length)

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`h-10 px-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${
          open ? 'bg-gray-50 dark:bg-gray-800' : ''
        }`}
      >
        {summary}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-60 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 p-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            {/* 清空不属于账号选项，独立放搜索框右侧；没选中任何账号时不可点 */}
            <button
              type="button"
              onClick={onClear}
              disabled={selected.length === 0}
              className="h-10 px-3 shrink-0 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            >
              {clearLabel}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onToggle(o.value)}
                  aria-pressed={activeSet.has(o.value)}
                  title={o.label}
                  className={`${CARD_BASE} ${activeSet.has(o.value) ? CARD_ON : CARD_OFF}`}
                >
                  <span className="min-w-0 truncate">{o.label}</span>
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="pt-1 pb-2 text-center text-sm text-gray-400">没有匹配项</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
