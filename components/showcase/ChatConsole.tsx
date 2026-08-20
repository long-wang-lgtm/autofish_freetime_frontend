'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send } from 'lucide-react'
import { chatQAs, chatSuggestions, fallbackAnswer } from './data'

interface ChatMsg {
  role: 'user' | 'agent'
  text: string
  time: string
}

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/** 渲染 **加粗** / `行内代码` / 换行，其余保持纯文本 */
function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => (
        <div key={i} className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={j} className="font-semibold text-gray-900 dark:text-gray-100">
                  {part.slice(2, -2)}
                </strong>
              )
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code
                  key={j}
                  className="px-1 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 font-mono"
                >
                  {part.slice(1, -1)}
                </code>
              )
            }
            return <span key={j}>{part}</span>
          })}
        </div>
      ))}
    </div>
  )
}

export function ChatConsole() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 欢迎语
  useEffect(() => {
    setMessages([
      {
        role: 'agent',
        text: '你好，我是闲逸通数据运营 Agent。\n我可以回答运营相关问题，例如：\n- 今天重点运营哪个账号？\n- 有哪些商品建议下架？\n- 你会自动改价吗？\n（当前为演示环境，对话为预置脚本）',
        time: now(),
      },
    ])
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  const ask = (q: string) => {
    const question = q.trim()
    if (!question || typing) return
    setMessages((m) => [...m, { role: 'user', text: question, time: now() }])
    setInput('')
    setTyping(true)
    window.setTimeout(() => {
      const hit = chatQAs.find((c) => c.keywords.some((k) => question.includes(k)))
      setMessages((m) => [
        ...m,
        { role: 'agent', text: hit ? hit.answer : fallbackAnswer, time: now() },
      ])
      setTyping(false)
    }, 700)
  }

  return (
    <div className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white shrink-0">
          <Bot size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              闲逸通数据运营 Agent
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              在线
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            今日分析已完成 · 报告已推送 · 演示环境
          </p>
        </div>
      </div>

      {/* 消息区 */}
      <div ref={scrollRef} className="h-96 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50 dark:bg-gray-950">
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-lg bg-blue-600 text-white px-3 py-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                <p className="text-right text-xs text-blue-200 mt-1 leading-none">{msg.time}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white shrink-0 mt-0.5">
                <Bot size={14} />
              </div>
              <div className="max-w-[85%] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5">
                <RichText text={msg.text} />
                <p className="text-right text-xs text-gray-400 mt-1 leading-none">{msg.time}</p>
              </div>
            </div>
          ),
        )}
        {typing && (
          <div className="flex gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white shrink-0 mt-0.5">
              <Bot size={14} />
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5">
              <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="ml-2 text-xs text-gray-400">正在分析…</span>
            </div>
          </div>
        )}
      </div>

      {/* 预置问题 chips */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
        {chatSuggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={typing}
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* 输入行 */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          placeholder="输入问题，体验模拟对话…"
          className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => ask(input)}
          disabled={typing || !input.trim()}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Send size={15} />
          发送
        </button>
      </div>
    </div>
  )
}
