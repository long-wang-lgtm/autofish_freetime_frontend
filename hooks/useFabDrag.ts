'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface FabPosition {
  right: number
  bottom: number
}

interface FabDragHandlers {
  onTouchStart: React.TouchEventHandler<HTMLElement>
  onTouchMove: React.TouchEventHandler<HTMLElement>
  onTouchEnd: React.TouchEventHandler<HTMLElement>
  onMouseDown: React.MouseEventHandler<HTMLElement>
}

interface FabDragResult {
  /** Reactive FAB position for style binding */
  fabPos: FabPosition
  /** Pre-computed style: { right, bottom, touchAction } */
  fabStyle: { right: number; bottom: number; touchAction: 'none' }
  /** Ref tracking cumulative drag distance — check < 5 to distinguish click from drag */
  dragDistRef: React.MutableRefObject<number>
  /** Touch/mouse event handlers to spread onto the FAB button */
  fabHandlers: FabDragHandlers
}

function clampFabPos(right: number, bottom: number): FabPosition {
  return {
    right: Math.max(0, Math.min(right, window.innerWidth - 48)),
    bottom: Math.max(0, Math.min(bottom, window.innerHeight - 48)),
  }
}

/**
 * Shared FAB drag logic — persisted position, pointer-event handling, and
 * click-vs-drag disambiguation.  Used by Sidebar and AdminSidebar.
 *
 * @param storageKey — unique localStorage key per sidebar instance
 */
export function useFabDrag(storageKey: string): FabDragResult {
  const fabPosRef = useRef<FabPosition>({ right: 16, bottom: 16 })
  const [fabPos, setFabPos] = useState<FabPosition>({ right: 16, bottom: 16 })
  const dragStart = useRef({ x: 0, y: 0, right: 0, bottom: 0 })
  const dragDist = useRef(0)
  const dragging = useRef(false)

  // Restore persisted position on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const pos = JSON.parse(saved) as FabPosition
        const clamped = clampFabPos(pos.right, pos.bottom)
        setFabPos(clamped)
        fabPosRef.current = clamped
      }
    } catch {
      /* ignore corrupt data */
    }
  }, [storageKey])

  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    dragging.current = true
    dragDist.current = 0
    dragStart.current = {
      x: clientX,
      y: clientY,
      right: fabPosRef.current.right,
      bottom: fabPosRef.current.bottom,
    }
  }, [])

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current) return
    const deltaX = dragStart.current.x - clientX
    const deltaY = dragStart.current.y - clientY
    dragDist.current = Math.abs(deltaX) + Math.abs(deltaY)
    const newPos = clampFabPos(
      dragStart.current.right + deltaX,
      dragStart.current.bottom + deltaY,
    )
    fabPosRef.current = newPos
    setFabPos({ ...newPos })
  }, [])

  const handlePointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    try {
      localStorage.setItem(storageKey, JSON.stringify(fabPosRef.current))
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [storageKey])

  // Global mouse-move / mouse-up listeners (pointer may leave the button)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY)
    const onMouseUp = () => handlePointerUp()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [handlePointerMove, handlePointerUp])

  const fabHandlers: FabDragHandlers = {
    onTouchStart: (e) => {
      const t = e.touches[0]
      handlePointerDown(t.clientX, t.clientY)
    },
    onTouchMove: (e) => {
      const t = e.touches[0]
      handlePointerMove(t.clientX, t.clientY)
    },
    onTouchEnd: () => handlePointerUp(),
    onMouseDown: (e) => {
      handlePointerDown(e.clientX, e.clientY)
    },
  }

  const fabStyle = {
    right: fabPos.right,
    bottom: fabPos.bottom,
    touchAction: 'none' as const,
  }

  return { fabPos, fabStyle, dragDistRef: dragDist, fabHandlers }
}
