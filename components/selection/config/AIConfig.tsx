'use client'

import { useState } from 'react'
import { Zap, ZapOff } from 'lucide-react'

export function AIConfig() {
  const [autoEnabled, setAutoEnabled] = useState(true)

  return (
    <div className="bg-white rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 mb-4">AI 分析配置</h3>
      <div className="space-y-4">
        {/* 自动分析开关 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">自动分析</div>
            <div className="text-xs text-gray-400 mt-0.5">开启后达到阈值自动触发AI分析</div>
          </div>
          <button
            onClick={() => setAutoEnabled(!autoEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              autoEnabled ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                autoEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
            {autoEnabled ? (
              <Zap className="absolute right-0.5 top-0.5 w-3 h-3 text-white" />
            ) : (
              <ZapOff className="absolute left-0.5 top-0.5 w-3 h-3 text-gray-400" />
            )}
          </button>
        </div>

        {/* 阈值 */}
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-500">触发阈值</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              defaultValue={20}
              className="w-16 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
            <span className="text-sm text-gray-400">件/天 以上自动分析</span>
          </div>
        </div>

        {/* 定时 */}
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-500">定时分析</label>
          <input
            type="time"
            defaultValue="08:00"
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
          <span className="text-sm text-gray-400">每天自动分析一次</span>
        </div>
      </div>
    </div>
  )
}
