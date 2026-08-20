'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Terminal } from 'lucide-react'
import { workflowLabels, workflowLines } from './data'

const STEP_MS = 650

export function WorkflowTimeline() {
  const [visible, setVisible] = useState(0)
  const [playing, setPlaying] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
  }

  const start = () => {
    if (playing) return
    clearTimers()
    setPlaying(true)
    setVisible(0)
    workflowLabels.forEach((_, i) => {
      timersRef.current.push(
        window.setTimeout(() => {
          setVisible(i + 1)
          if (i === workflowLabels.length - 1) {
            setPlaying(false)
          }
        }, STEP_MS * (i + 1)),
      )
    })
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) start()
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const done = visible >= workflowLabels.length

  return (
    <div ref={ref} className="space-y-4">
      {/* 步骤标签时间线 */}
      <div className="flex flex-wrap items-center gap-y-2">
        {workflowLabels.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <span
                className={
                  i < visible
                    ? 'flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                    : 'flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400'
                }
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {i < visible ? (
                    <path d="M20 6L9 17l-5-5" />
                  ) : (
                    <circle cx="12" cy="12" r="9" />
                  )}
                </svg>
              </span>
              <span
                className={
                  i < visible
                    ? 'text-xs font-medium text-gray-700 dark:text-gray-300'
                    : 'text-xs text-gray-400'
                }
              >
                {label}
              </span>
            </div>
            {i < workflowLabels.length - 1 && (
              <span className="mx-2 text-gray-300 dark:text-gray-600 text-xs">→</span>
            )}
          </div>
        ))}
      </div>

      {/* 终端面板 */}
      <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900 shadow-sm">
        {/* 标题栏 */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/80 border-b border-gray-700">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-gray-400 font-mono">
            <Terminal size={12} />
            fire_analyze — 每日工作流回放
          </span>
        </div>

        {/* 输出区 */}
        <div className="px-4 py-4 font-mono text-sm leading-relaxed min-h-[240px]">
          <p className="text-gray-300">
            <span className="text-emerald-400">$</span>{' '}
            <span className="text-gray-100">uv run python main.py run --prod</span>
          </p>
          <div className="mt-2 space-y-1.5">
            {workflowLines.slice(0, visible).map((line, i) =>
              line.startsWith('#') ? (
                <p key={i} className="text-gray-500 italic">
                  {line}
                </p>
              ) : (
                <p key={i} className="flex gap-2 text-gray-400">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span className="text-gray-300">{line}</span>
                </p>
              ),
            )}
            {!done && (
              <p className="flex gap-2 text-gray-500">
                <span className="text-emerald-400 shrink-0 animate-pulse">▊</span>
                <span className="animate-pulse">等待输出…</span>
              </p>
            )}
          </div>
          {done && (
            <p className="mt-3 text-emerald-400">
              ✓ 全部完成 —— 报告已推送，动作清单见控制台
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <RefreshCw size={14} />
          重新播放
        </button>
      </div>
    </div>
  )
}
