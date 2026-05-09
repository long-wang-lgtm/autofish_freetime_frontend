'use client'
import { useEffect } from 'react'

interface ImageLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

export function ImageLightbox({ src, alt = '封面图', onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-3xl max-h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[80vh] object-contain rounded"
          onClick={e => e.stopPropagation()}
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center text-gray-700 hover:bg-white"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
