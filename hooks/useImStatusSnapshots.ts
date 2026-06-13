'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { subscribeImStatus, type ImStatusSnapshot } from '@/lib/api/administrators'

// ===== 模块级共享状态（单例 SSE 连接） =====
let sharedSnapshots: ImStatusSnapshot[] = []
const listeners = new Set<() => void>()
let abortFn: (() => void) | null = null
let subscribeAttempted = false

function start() {
  if (subscribeAttempted) return
  subscribeAttempted = true
  abortFn = subscribeImStatus((snapshot) => {
    sharedSnapshots = [...sharedSnapshots.slice(-99), snapshot]
    listeners.forEach((notify) => notify())
  })
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  // 首个订阅者 → 启动 SSE
  start()
  return () => {
    listeners.delete(callback)
    // 最后一个订阅者离开 → 断开 SSE
    if (listeners.size === 0 && abortFn) {
      abortFn()
      abortFn = null
      subscribeAttempted = false
    }
  }
}

function getSnapshot(): ImStatusSnapshot[] {
  return sharedSnapshots
}

function getServerSnapshot(): ImStatusSnapshot[] {
  return []
}

// ===== Hook =====
/**
 * 订阅 IM 服务运行状态数据。
 * 多个组件同时使用时，共享同一个 SSE 连接——首个订阅者建立连接，
 * 最后一个退订者断开连接。
 */
export function useImStatusSnapshots(): ImStatusSnapshot[] {
  // SSR 安全：用 useState + useEffect 做客户端初始化
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const snapshots = useSyncExternalStore(
    mounted ? subscribe : () => () => {},
    mounted ? getSnapshot : getServerSnapshot,
  )

  return snapshots
}
