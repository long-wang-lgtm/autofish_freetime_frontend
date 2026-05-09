'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

interface ResizableDividerProps {
  direction: 'horizontal' | 'vertical'
  onResize?: (delta: number) => void
}

export function ResizableDivider({ direction, onResize }: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startPos = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY
  }, [direction])

  useEffect(() => {
    if (!isDragging) return

    const onMouseMove = (e: MouseEvent) => {
      const current = direction === 'horizontal' ? e.clientX : e.clientY
      const delta = current - startPos.current
      startPos.current = current
      onResize?.(delta)
    }

    const onMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDragging, direction, onResize])

  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        ${direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        ${isDragging ? 'bg-blue-400' : 'bg-gray-200 hover:bg-blue-300'}
        transition-colors select-none flex-shrink-0
      `}
      style={{ touchAction: 'none' }}
    />
  )
}
