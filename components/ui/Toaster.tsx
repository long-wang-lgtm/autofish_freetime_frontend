'use client'

import { Toaster as SonnerToaster, toast } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  )
}

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  title: string
  description?: string
  variant?: ToastVariant
}

export function useToast() {
  return {
    addToast: (props: ToastProps) => {
      const { title, description, variant = 'default' } = props
      // toaster 颜色严格遵循 frontend-colors.md Section 6 toaster 颜色对照表
      const style = variant === 'error' ? { backgroundColor: '#fee2e2', borderColor: '#ef4444', color: '#991b1b' } :
                    variant === 'success' ? { backgroundColor: '#dcfce7', borderColor: '#22c55e', color: '#166534' } :
                    variant === 'warning' ? { backgroundColor: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' } :
                    variant === 'info' ? { backgroundColor: '#dbeafe', borderColor: '#3b82f6', color: '#1e40af' } :
                    {}

      toast(title, {
        description,
        style,
        duration: variant === 'error' ? 5000 : 3000,
      })
    },
  }
}