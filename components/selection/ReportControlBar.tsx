'use client'

import { Bell, Clock, BarChart2 } from 'lucide-react'

export function ReportControlBar() {
  return (
    <div className="flex items-center gap-5 bg-white rounded-xl p-4">
      <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all">
        <Bell className="w-4 h-4" />
        生成报告
      </button>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="w-4 h-4 text-gray-400" />
        <span>定时:</span>
        <select className="bg-transparent border-none text-sm focus:outline-none cursor-pointer">
          <option>每天 08:00</option>
          <option>每天 12:00</option>
          <option>每天 18:00</option>
          <option>关闭</option>
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <BarChart2 className="w-4 h-4 text-gray-400" />
        <span>阈值:</span>
        <input
          type="number"
          defaultValue={20}
          className="w-14 bg-transparent border-none text-sm focus:outline-none text-center"
        />
        <span>件/天 以上自动分析</span>
      </div>
    </div>
  )
}
