import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './../styles/globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { QueryProvider } from '@/lib/api/queryClient'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '闲鱼自动化管理后台',
  description: '闲鱼多账号自动化管理系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <AuthProvider>
          <QueryProvider>
            <Toaster />
            {children}
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}