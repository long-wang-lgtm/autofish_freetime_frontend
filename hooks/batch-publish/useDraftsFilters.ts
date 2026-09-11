'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'
import { DRAFT_BACKLOG_STATUS } from '@/components/batch-publish/shared/constants'

/** 账号筛选在 URL 中的参数名——与列表接口字段 to_uid 对齐 */
const TO_UID_PARAM = 'to_uid'

/**
 * 草稿箱筛选状态——默认范围为全部未发布素材，状态/账号变化时重置到第一页。
 *
 * 账号筛选额外持久化到 URL（`?tab=drafts&to_uid=xxx`），刷新/分享后保留；
 * 写入时基于当前 searchParams 展开，tab 等既有参数原样保留。
 */
export function useDraftsFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(DRAFT_BACKLOG_STATUS)
  // 初值来自 URL —— 刷新后账号筛选不丢
  const [toUid, setToUid] = useState(() => searchParams.get(TO_UID_PARAM) ?? '')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const debouncedSearch = useDebounce(search, 300)

  // 账号筛选 → URL（保留 tab 等既有参数）。lastUrlRef 以挂载时的 URL 为初值：
  // 首帧状态本就取自 URL，无需回写，避免挂载时多余的一次 replace。
  const lastUrlRef = useRef<string | null>(
    searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname,
  )

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (toUid) params.set(TO_UID_PARAM, toUid)
    else params.delete(TO_UID_PARAM)
    const qs = params.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    if (url === lastUrlRef.current) return
    lastUrlRef.current = url
    router.replace(url, { scroll: false })
  }, [toUid, router, pathname, searchParams])

  const filters = {
    search: debouncedSearch,
    status: status || undefined,
    toUid: toUid || undefined,
  }

  const onFilterChange = useCallback((key: string, value: string) => {
    if (key === 'search') setSearch(value)
    if (key === 'status') { setStatus(value); setPage(1) }
    if (key === 'toUid') { setToUid(value); setPage(1) }
  }, [])

  return {
    search,
    status,
    toUid,
    page,
    pageSize,
    setPage,
    filters,
    onFilterChange,
  }
}
