'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 观测元素的实测宽度（px）
 *
 * 给"按像素排版"的图表用：文字留白是固定开销，只有拿到真实宽度才能把
 * 剩下的空间全部分给绘图区。返回的 ref 绑到容器上即可，首帧宽度为 0，
 * 量到之后触发重算。
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0
      setWidth(Math.round(next))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}
