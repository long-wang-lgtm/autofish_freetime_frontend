"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface ImageLightboxProps {
  /** 大图地址。为 null（或空串）时不渲染，开合由调用方的 state 决定 */
  src: string | null
  alt?: string
  onClose: () => void
}

/**
 * 图片放大预览（灯箱）。
 *
 * 全屏遮罩 + 居中大图，点击任意处（遮罩、图片本身、关闭按钮）或按 Esc 关闭。
 * 放大是一次「看一眼」的动作，任何一次点击都该能退出 —— 否则用户得先找到关闭
 * 按钮才能回去接着编辑。
 *
 * 用 portal 挂到 body：调用方常身处弹窗或抽屉内，就地渲染会被容器的
 * overflow 裁掉。z-index 取 60，压在 Modal 的 50 之上。
 */
export function ImageLightbox({ src, alt = "", onClose }: ImageLightboxProps) {
  // Esc 关闭。监听挂在 document 上，因为焦点未必落在遮罩里。
  //
  // 挂捕获阶段并阻断传播：调用方（如商品编辑弹窗）往往也在 document 上听 Esc
  // 关自己，不拦的话用户按一次 Esc 会连预览带整个弹窗一起关掉，未保存的改动也
  // 一并标成待丢弃。捕获阶段先于冒泡阶段触发，在这里 stopPropagation 即可挡住。
  useEffect(() => {
    if (!src) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.stopPropagation()
      onClose()
    }
    document.addEventListener("keydown", onKeyDown, true)
    return () => document.removeEventListener("keydown", onKeyDown, true)
  }, [src, onClose])

  if (!src) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "图片预览"}
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center cursor-pointer"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
      <button
        type="button"
        aria-label="关闭预览"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>,
    document.body
  )
}
