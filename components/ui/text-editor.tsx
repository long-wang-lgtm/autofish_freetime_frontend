"use client"

import { useState, useEffect } from "react"
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

/** 防止用户拖拽 textarea 过高导致外层容器出现滚动条 */
const DEVICE_MAX_H: Record<Device, string> = {
  pc: "max-h-[60vh]",
  "mobile-landscape": "max-h-[40vh]",
  "mobile-portrait": "max-h-[35vh]",
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

  useEffect(() => {
    if (!isMobile) return
    const mql = window.matchMedia("(orientation: portrait)")
    setIsPortrait(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [isMobile])

  const device =
    deviceProp ??
    (isMobile
      ? isPortrait
        ? "mobile-portrait"
        : "mobile-landscape"
      : "pc")

  const resolvedRows = resolveRows(rows, device)
  const padding = DEVICE_PADDING[device]
  const maxH = DEVICE_MAX_H[device]

  return (
    <textarea
      rows={resolvedRows}
      className={`w-full text-sm border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 ${padding} ${maxH} ${className ?? ""}`}
      {...rest}
    />
  )
}
