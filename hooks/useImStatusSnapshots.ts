'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { subscribeImStatus, type ImStatusSnapshot } from '@/lib/api/admin'

// ===== 模块级共享状态（单例 SSE 连接） =====
let sharedSnapshots: ImStatusSnapshot[] = []
const listeners = new Set<() => void>()
let abortFn: (() => void) | null = null
let subscribeAttempted = false
let disconnectTimer: ReturnType<typeof setTimeout> | null = null

/** 全局 SSE 连接断开延迟（毫秒）：页面切换期间保持连接 */
const DISCONNECT_DELAY = 5000

function start() {
  if (subscribeAttempted) return
  subscribeAttempted = true
  abortFn = subscribeImStatus(
    (snapshot) => {
      // 保留最近 4320 条（72小时 @ 1条/分钟）
      sharedSnapshots = [...sharedSnapshots.slice(-4319), snapshot]
      listeners.forEach((notify) => notify())
    },
    (err) => {
      console.error('[IM Status SSE] 连接错误:', err.message)
      // 连接出错后重置状态，允许下次订阅时重连
      abortFn = null
      subscribeAttempted = false
    },
  )
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  // 有新订阅者加入时，取消待处理的断开计时器
  if (disconnectTimer) {
    clearTimeout(disconnectTimer)
    disconnectTimer = null
  }
  // 首个订阅者 → 启动 SSE（或复用已有连接）
  start()
  return () => {
    listeners.delete(callback)
    // 最后一个订阅者离开时，延迟断开（避免页面切换瞬间重连）
    if (listeners.size === 0 && abortFn && !disconnectTimer) {
      disconnectTimer = setTimeout(() => {
        if (listeners.size === 0 && abortFn) {
          abortFn()
          abortFn = null
          subscribeAttempted = false
        }
        disconnectTimer = null
      }, DISCONNECT_DELAY)
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
