'use client'

import { useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

/**
 * Tab 路由 hook — 将当前 Tab 状态持久化到 URL 查询参数。
 *
 * 用法：
 *   const [tab, setTab] = useTabRouting(['keyword', 'product', 'merchant'], 'keyword')
 *
 * @param validTabs 合法的 Tab key 列表，用于校验 URL 参数
 * @param defaultTab 默认 Tab（URL 无参数或参数非法时 fallback）
 * @param paramName 查询参数名，默认 'tab'
 * @returns [当前 Tab, 切换 Tab 回调]
 *
 * 注意：调用方必须包裹在 <Suspense> 中（Next.js useSearchParams 要求）。
 */
export function useTabRouting<T extends string>(
  validTabs: T[],
  defaultTab: T,
  paramName: string = 'tab'
): [T, (tab: T) => void] {
  const searchParams = useSearchParams()
  const router = useRouter()

  const raw = searchParams.get(paramName)
  const currentTab: T = (raw && validTabs.includes(raw as T)) ? raw as T : defaultTab

  const setTab = useCallback((tab: T) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, tab)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams, paramName])

  return [currentTab, setTab]
}
