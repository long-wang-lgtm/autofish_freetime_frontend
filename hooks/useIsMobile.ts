"use client"

import { useState, useEffect } from "react"

/**
 * 监听窗口宽度，判断是否为移动端（< 768px 即 md 断点以下）
 * 使用 CSS media query 而非 window.innerWidth 避免 hydration 不匹配
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)")
    setIsMobile(mql.matches)

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return isMobile
}
