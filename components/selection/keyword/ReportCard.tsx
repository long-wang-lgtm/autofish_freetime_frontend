'use client'

import { useState } from 'react'
import { DailyReport } from '@/lib/api/selection'
import { Flame, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle } from 'lucide-react'

interface ReportCardProps {
  report: DailyReport
}

const actionConfig = {
  '重点跟进': { icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-green-600 bg-green-50' },
  '观察': { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-yellow-600 bg-yellow-50' },
  '暂不推荐': { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-600 bg-red-50' },
}

export function ReportCard({ report }: ReportCardProps) {
  const [expanded, setExpanded] = useState(false)
  const action = actionConfig[report.actionTag]

  return (
    <div className="bg-white rounded-xl p-4 hover:shadow-sm transition-all">
      {/* 卡片头部 */}
      <div
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900">{report.title}</h3>
              <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${action.color}`}>
                {action.icon}
                {report.actionTag}
              </span>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{report.summary}</p>
          </div>
          <div className="text-gray-300 ml-4">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>

        {/* 底部信息 */}
        <div className="flex items-center gap-5 mt-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Flame className={`w-3.5 h-3.5 ${report.heatLevel >= 4 ? 'text-red-400' : 'text-orange-400'}`} />
            热度 {report.heatLevel}/5
          </span>
          <span>{report.productCount}件商品</span>
          <span>{report.date} {report.generatedAt}</span>
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-gray-100 space-y-4">
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {report.summary}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">相关商品</h4>
            <div className="grid grid-cols-3 gap-3">
              {report.products.map((p) => (
                <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-900 truncate">{p.title}</div>
                  <div className="text-xs text-gray-400 mt-1">¥{p.price} · 👍{p.wantCount}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-400">
            AI 置信度: 高 | 数据来源: 当日采集 {report.productCount} 件商品
          </div>
        </div>
      )}
    </div>
  )
}
