'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // 检查是否已登录，如果没有则跳转到登录页
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify')
        const data = await response.json()
        
        if (data.success) {
          // 已登录，跳转到主页面
          router.push('/dashboard')
        } else {
          // 未登录，跳转到登录页
          router.push('/login')
        }
      } catch (error) {
        // 网络错误，默认跳转到登录页
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  // 显示加载状态
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-bg">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-warm-text font-sans">正在进入我们的世界...</p>
      </div>
    </div>
  )
}