/**
 * 选品模块 Zustand 状态管理
 */
import { create } from 'zustand'
import { Category, CategoryType } from '@/lib/api/selection'

interface SelectionState {
  categories: Category[]
  activeType: CategoryType
  selectedCategoryId: string | null
  setCategories: (cats: Category[]) => void
  setActiveType: (type: CategoryType) => void
  setSelectedCategoryId: (id: string | null) => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  categories: [],
  activeType: 'scene',
  selectedCategoryId: null,
  setCategories: (categories) => set({ categories }),
  setActiveType: (activeType) => set({ activeType }),
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
}))
