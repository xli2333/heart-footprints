'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart, LogOut } from 'lucide-react'
import { User } from '@/types/database'
import { getApiPath } from '@/lib/api-config'
import TodaysConnection from '@/components/TodaysConnection'
import MemoryGallery from '@/components/MemoryGallery'
import CountdownTimer from '@/components/CountdownTimer'
import LetterBox from '@/components/LetterBox'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(getApiPath('/auth/verify'))
        const data = await response.json()
        
        if (data.success) {
          setUser(data.data.user)
        } else {
          router.push('/login')
        }
      } catch (error) {
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-warm-text font-sans">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* 头部导航 */}
      <header className="bg-warm-paper border-b border-warm-muted">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary-500 rounded-full">
                <Heart className="w-5 h-5 text-warm-paper fill-current" />
              </div>
              <div>
                <h1 className="text-xl font-serif text-warm-text">心迹地图</h1>
                <p className="text-sm text-warm-text/70">Our Footprints</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-warm-text font-sans">
                欢迎回来，{user?.name}！
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-warm-text/70 hover:text-warm-text transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">退出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧主要模块 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 今日之约模块 */}
            <div id="todays-connection">
              <TodaysConnection />
            </div>

            {/* 时光相册模块 */}
            <div id="memory-gallery">
              <MemoryGallery />
            </div>
          </div>

          {/* 右侧侧边栏 */}
          <div className="space-y-6">
            {/* 倒数日模块 */}
            <CountdownTimer />

            {/* 时光信札模块 */}
            <div id="letter-box">
              <LetterBox />
            </div>

            {/* 快捷操作 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-warm-paper rounded-2xl p-6 shadow-lg border border-warm-muted"
            >
              <h3 className="text-lg font-serif text-warm-text mb-4">快捷操作</h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    // 滚动到时光相册组件
                    const memorySection = document.querySelector('#memory-gallery')
                    if (memorySection) {
                      memorySection.scrollIntoView({ behavior: 'smooth' })
                      // 触发上传按钮点击
                      setTimeout(() => {
                        const uploadBtn = document.querySelector('[data-upload-trigger]') as HTMLButtonElement
                        if (uploadBtn) uploadBtn.click()
                      }, 500)
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-warm-bg rounded-lg transition-colors text-warm-text/70 hover:text-warm-text"
                >
                  📸 上传新照片
                </button>
                <button 
                  onClick={() => {
                    // 滚动到今日之约组件
                    const connectionSection = document.querySelector('#todays-connection')
                    if (connectionSection) {
                      connectionSection.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-warm-bg rounded-lg transition-colors text-warm-text/70 hover:text-warm-text"
                >
                  📅 查看足迹历史
                </button>
                <button 
                  onClick={() => {
                    // 滚动到时光信札组件
                    const letterSection = document.querySelector('#letter-box')
                    if (letterSection) {
                      letterSection.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-warm-bg rounded-lg transition-colors text-warm-text/70 hover:text-warm-text"
                >
                  💌 查看所有信件
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}