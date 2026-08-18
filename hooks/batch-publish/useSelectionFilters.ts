'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export function useSelectionFilters() {
  // 三个独立搜索框：标题 / 店铺uid / 商品gid（uid/gid 后端精确匹配）
  const [title, setTitle] = useState('')
  const [uid, setUid] = useState('')
  const [gid, setGid] = useState('')
  const [monitorStatus, setMonitorStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [orderBy, setOrderBy] = useState<string | null>('wantSlope')
  const [asc, setAsc] = useState(false)

  const debouncedTitle = useDebounce(title, 300)
  const debouncedUid = useDebounce(uid, 300)
  const debouncedGid = useDebounce(gid, 300)

  const filters = {
    title: debouncedTitle || undefined,
    uid: debouncedUid || undefined,
    gid: debouncedGid || undefined,
    monitorStatus: monitorStatus || undefined,
  }

  const onFilterChange = useCallback((key: string, value: string) => {
    switch (key) {
      case 'title': setTitle(value); setPage(1); break
      case 'uid': setUid(value); setPage(1); break
      case 'gid': setGid(value); setPage(1); break
      case 'monitorStatus': setMonitorStatus(value); setPage(1); break
    }
  }, [])

  const onSortChange = useCallback((field: string | null) => {
    setOrderBy(field)
    setAsc(false)
    setPage(1)
  }, [])

  return {
    title,
    uid,
    gid,
    monitorStatus,
    page,
    pageSize,
    setPage,
    orderBy,
    asc,
    onSortChange,
    filters,
    onFilterChange,
  }
}
