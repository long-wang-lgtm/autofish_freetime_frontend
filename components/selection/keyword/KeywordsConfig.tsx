'use client'

import { useState } from 'react'
import { X, Plus, Lightbulb } from 'lucide-react'

const INITIAL_KEYWORDS = ['iPhone', '小米手机', '华为', 'OPPO']
const SUGGESTIONS = ['iPhone 14', 'iPhone 15', '二手手机', '蓝牙耳机', 'Switch']

export function KeywordsConfig() {
  const [keywords, setKeywords] = useState<string[]>(INITIAL_KEYWORDS)
  const [input, setInput] = useState('')

  const addKeyword = (kw: string) => {
    const trimmed = kw.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed])
    }
    setInput('')
  }

  return (
    <div className="bg-white rounded-xl p-4">
      <h3 className="font-semibold text-gray-900 mb-4">对标关键词</h3>

      {/* 输入区 */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addKeyword(input)}
          placeholder="输入关键词后按回车添加"
          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
        />
      </div>

      {/* 关键词标签 */}
      <div className="flex flex-wrap gap-2 mb-5">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm"
          >
            {kw}
            <button
              onClick={() => setKeywords(keywords.filter((k) => k !== kw))}
              className="hover:text-blue-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>

      {/* 建议 */}
      <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
        <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-gray-500">建议添加: </span>
          {SUGGESTIONS.map((s, i) => (
            <span key={s}>
              <button
                onClick={() => addKeyword(s)}
                className="text-blue-500 hover:underline"
              >
                {s}
              </button>
              {i < SUGGESTIONS.length - 1 && ' / '}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
