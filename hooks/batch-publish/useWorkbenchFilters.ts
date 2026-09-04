'use client'

import { useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

export function useWorkbenchFilters() {
  const searchParams = useSearchParams()
  // 选中对象 = 监控商品 gid（去商机化：URL 参数由 oid 改为 gid）
  const selectedGid = searchParams.get('gid') ?? undefined

  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<number>>(new Set())

  const toggleSelect = useCallback((id: number) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedMaterialIds(new Set())
  }, [])

  const openEditor = useCallback((id: number) => {
    setEditingMaterialId(id)
  }, [])

  const closeEditor = useCallback(() => {
    setEditingMaterialId(null)
  }, [])

  return {
    selectedGid,
    editingMaterialId,
    showCreateModal,
    selectedMaterialIds,
    setShowCreateModal,
    toggleSelect,
    clearSelection,
    openEditor,
    closeEditor,
  }
}
