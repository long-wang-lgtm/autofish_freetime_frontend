'use client'

import React from 'react'

interface MasterDetailLayoutProps {
  /** 左侧面板 */
  leftPanel: React.ReactNode
  /** 左侧面板宽度 */
  leftWidth?: number
  /** 右侧面板 */
  rightPanel: React.ReactNode
}

export function MasterDetailLayout({
  leftPanel,
  leftWidth = 200,
  rightPanel,
}: MasterDetailLayoutProps) {
  return (
    <div
      className="flex rounded-xl border border-gray-200 bg-white overflow-hidden"
      style={{ minHeight: '500px' }}
    >
      {/* 左侧面板 */}
      <div
        className="shrink-0 border-r border-gray-200 overflow-y-auto"
        style={{ width: leftWidth }}
      >
        {leftPanel}
      </div>

      {/* 右侧面板 */}
      <div className="flex-1 overflow-y-auto p-6">
        {rightPanel}
      </div>
    </div>
  )
}
