'use client'

import { LayoutGrid, List } from 'lucide-react'

interface ViewToggleProps {
  view: 'grid' | 'list'
  onChange: (view: 'grid' | 'list') => void
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => onChange('grid')}
        className={`p-2 rounded transition-colors ${
          view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'
        }`}
        title="网格视图"
      >
        <LayoutGrid className="w-5 h-5" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-2 rounded transition-colors ${
          view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'
        }`}
        title="列表视图"
      >
        <List className="w-5 h-5" />
      </button>
    </div>
  )
}
