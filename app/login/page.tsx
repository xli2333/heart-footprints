'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart, Lock } from 'lucide-react'
import { getApiPath } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const router = useRouter()
  const { setUser } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(getApiPath('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (data.success) {
        // 保存用户信息到context
        setUser(data.data.user)
        // 成功登录，跳转到主页
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(data.error)
        // 触发输入框摇摆动画
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 600)
        setPassword('')
      }
    } catch (error) {
      setError('网络连接出现问题，请检查后重试')
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 600)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-bg to-warm-paper px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="inline-flex items-center justify-center w-20 h-20 bg-primary-500 rounded-full mb-4"
          >
            <Heart className="w-10 h-10 text-warm-paper fill-current" />
          </motion.div>
          
          <h1 className="text-3xl font-serif text-warm-text mb-2">
            心迹地图
          </h1>
          
          <p className="text-warm-text/70 font-sans">
            欢迎回到我们的专属世界
          </p>
        </div>

        {/* 登录表单 */}
        <motion.div
          className="bg-warm-paper rounded-2xl p-8 shadow-lg border border-warm-muted"
          animate={isShaking ? {
            x: [-10, 10, -10, 10, 0],
          } : {}}
          transition={{ duration: 0.6 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="sr-only">
                请输入我们的暗号
              </label>
              
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-warm-text/50" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入我们的暗号"
                  className="w-full pl-12 pr-4 py-4 bg-warm-bg border border-warm-muted rounded-xl 
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
                           placeholder-warm-text/50 text-warm-text font-sans
                           transition-all duration-200"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm text-center bg-red-50 py-2 px-4 rounded-lg"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={isLoading || !password}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-warm-muted 
                       text-warm-paper font-medium py-4 px-6 rounded-xl 
                       transition-all duration-200 shadow-sm hover:shadow-md
                       disabled:cursor-not-allowed disabled:text-warm-text/50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-warm-paper/30 border-t-warm-paper rounded-full animate-spin"></div>
                  <span>进入中...</span>
                </div>
              ) : (
                '进入我们的世界'
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* 底部装饰 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-8"
        >
          <p className="text-warm-text/50 text-sm font-sans">
            用心记录，用爱连接 ✨
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}