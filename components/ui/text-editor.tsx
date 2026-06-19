"use client"

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react"
import { useIsMobile } from "@/hooks/useIsMobile"

type Device = "pc" | "mobile-landscape" | "mobile-portrait"

interface TextEditorProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
  /** 覆盖响应式行数默认值，传数字则固定行数 */
  rows?: number | { pc?: number; landscape?: number; portrait?: number }
  /** 强制指定设备模式，不传则自动检测 */
  device?: Device
}

const DEFAULT_ROWS: Record<Device, number> = {
  pc: 6,
  "mobile-landscape": 4,
  "mobile-portrait": 3,
}

const DEVICE_PADDING: Record<Device, string> = {
  pc: "px-3 py-2.5",
  "mobile-landscape": "px-3 py-2",
  "mobile-portrait": "px-2.5 py-2",
}

function resolveRows(
  rows: TextEditorProps["rows"],
  device: Device
): number {
  if (typeof rows === "number") return rows
  const defaults = { ...DEFAULT_ROWS, ...rows }
  return defaults[device]
}

export function TextEditor({
  rows,
  device: deviceProp,
  className,
  ...rest
}: TextEditorProps) {
  const isMobile = useIsMobile()
  const [isPortrait, setIsPortrait] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!isMobile) return
    const mql = window.matchMedia("(orientation: portrait)")
    setIsPortrait(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [isMobile])

  // ============================================================
  // max-height 自适应 — 不超出最近的滚动祖先容器
  // ============================================================
  const applyMaxHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return

    // 向上查找最近的 overflow-y: auto/scroll 祖先
    let container: HTMLElement | null = el.parentElement
    while (container) {
      const style = window.getComputedStyle(container)
      if (style.overflowY === "auto" || style.overflowY === "scroll") break
      container = container.parentElement
    }

    const MIN_HEIGHT = 60 // 最小高度，防止被压扁

    if (container) {
      const cr = container.getBoundingClientRect()
      const tr = el.getBoundingClientRect()
      const available = cr.bottom - tr.top - 8 // 8px 底部缓冲
      el.style.maxHeight = `${Math.max(available, MIN_HEIGHT)}px`
    } else {
      // 无滚动容器时，以视口为参考
      const tr = el.getBoundingClientRect()
      const available = window.innerHeight - tr.top - 16
      el.style.maxHeight = `${Math.max(available, MIN_HEIGHT)}px`
    }
  }, [])

  // 每次渲染后重算（覆盖内容变化导致的 textarea 位置偏移）
  useLayoutEffect(() => {
    applyMaxHeight()
  })

  // 监听容器大小变化 & 窗口大小变化
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    // 查找滚动祖先用于 ResizeObserver
    let container: HTMLElement | null = el.parentElement
    while (container) {
      const style = window.getComputedStyle(container)
      if (style.overflowY === "auto" || style.overflowY === "scroll") break
      container = container.parentElement
    }

    const ro = container
      ? new ResizeObserver(() => applyMaxHeight())
      : null
    if (ro && container) ro.observe(container)

    // 监听 textarea 自身大小变化（用户拖拽 resize 手柄）
    const selfRo = new ResizeObserver(() => applyMaxHeight())
    selfRo.observe(el)

    window.addEventListener("resize", applyMaxHeight)

    return () => {
      ro?.disconnect()
      selfRo.disconnect()
      window.removeEventListener("resize", applyMaxHeight)
    }
  }, [applyMaxHeight])

  const device =
    deviceProp ??
    (isMobile
      ? isPortrait
        ? "mobile-portrait"
        : "mobile-landscape"
      : "pc")

  const resolvedRows = resolveRows(rows, device)
  const padding = DEVICE_PADDING[device]

  // 从 rest 中提取外部 ref（react-hook-form register 传入），与内部 ref 合并
  const restProps = rest as Record<string, unknown>
  const externalRef = restProps.ref as
    | ((instance: HTMLTextAreaElement | null) => void)
    | { current: HTMLTextAreaElement | null }
    | null
    | undefined
  const { ref: _r, ...restWithoutRef } = restProps

  return (
    <textarea
      ref={(el) => {
        textareaRef.current = el
        if (typeof externalRef === "function") {
          externalRef(el)
        } else if (externalRef && "current" in externalRef) {
          ;(externalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
        }
      }}
      rows={resolvedRows}
      className={`w-full text-sm border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 ${padding} ${className ?? ""}`}
      {...(restWithoutRef as Omit<
        React.TextareaHTMLAttributes<HTMLTextAreaElement>,
        "rows" | "ref"
      >)}
    />
  )
}
