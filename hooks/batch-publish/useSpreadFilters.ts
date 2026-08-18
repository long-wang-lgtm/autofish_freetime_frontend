'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export function useSpreadFilters() {
  // 五个独立搜索框：描述 / 商机名 / 选品标题 / 商品ID / 账号ID
  const [description, setDescription] = useState('')
  const [oppName, setOppName] = useState('')
  const [itemTitle, setItemTitle] = useState('')
  const [souItemId, setSouItemId] = useState('')
  const [toUid, setToUid] = useState('')
  // 素材工作台默认展示全部素材（含进行中的草稿，二创素材创建后立即可见）
  const [status, setStatus] = useState('')

  const debouncedDescription = useDebounce(description, 300)
  const debouncedOppName = useDebounce(oppName, 300)
  const debouncedItemTitle = useDebounce(itemTitle, 300)
  const debouncedSouItemId = useDebounce(souItemId, 300)
  const debouncedToUid = useDebounce(toUid, 300)

  const filters = {
    description: debouncedDescription || undefined,
    oppName: debouncedOppName || undefined,
    itemTitle: debouncedItemTitle || undefined,
    souItemId: debouncedSouItemId || undefined,
    toUid: debouncedToUid || undefined,
    status: status || undefined,
  }

  const onFilterChange = useCallback((key: string, value: string | undefined) => {
    switch (key) {
      case 'description': setDescription(value as string); break
      case 'oppName': setOppName(value as string); break
      case 'itemTitle': setItemTitle(value as string); break
      case 'souItemId': setSouItemId(value as string); break
      case 'toUid': setToUid(value as string); break
      case 'status': setStatus(value as string); break
    }
  }, [])

  return {
    description,
    oppName,
    itemTitle,
    souItemId,
    toUid,
    status,
    filters,
    onFilterChange,
  }
}
