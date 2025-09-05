import type { Metadata } from 'next'
import './globals.css'
import { cn } from '@/lib/utils'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: '心迹地图 | Our Footprints',
  description: '专属于你们的私密时光空间',
  keywords: ['love', 'couple', 'memory', 'footprints'],
  authors: [{ name: 'LXG' }],
  robots: 'noindex, nofollow', // 私密网站，不被搜索引擎索引
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className={cn(
        "min-h-screen bg-warm-bg text-warm-text antialiased font-sans"
      )}>
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}