'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Heart, Loader2, Smile, AlertCircle } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import { getApiPath } from '@/lib/api-config'

interface LocationStatus {
  himSynced: boolean
  herSynced: boolean
  bothSynced: boolean
  currentUserSynced: boolean
  distance: number | null
  distanceMessage: string
  himLocation?: {
    latitude: number
    longitude: number
    mood_emoji?: string
    created_at: string
  } | null
  herLocation?: {
    latitude: number
    longitude: number
    mood_emoji?: string
    created_at: string
  } | null
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// 心情表情选项
const MOOD_EMOJIS = [
  { emoji: '😊', label: '开心' },
  { emoji: '😍', label: '想你' },
  { emoji: '😴', label: '想睡' },
  { emoji: '😋', label: '好饿' },
  { emoji: '🤔', label: '思考中' },
  { emoji: '😎', label: '很酷' },
  { emoji: '🥺', label: '想抱抱' },
  { emoji: '😤', label: '生气气' }
]

export default function TodaysConnection() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMood, setSelectedMood] = useState<string>('')
  const [showMoodSelector, setShowMoodSelector] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [locationError, setLocationError] = useState('')

  // 获取今日状态
  const { data, error, isLoading: statusLoading } = useSWR<{
    success: boolean
    data: LocationStatus
  }>(getApiPath('/location/status'), fetcher, {
    refreshInterval: 30000, // 每30秒刷新一次
    revalidateOnFocus: true
  })

  const status = data?.data

  // 获取地理位置
  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持地理定位'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('请允许获取位置信息'))
              break
            case error.POSITION_UNAVAILABLE:
              reject(new Error('位置信息不可用'))
              break
            case error.TIMEOUT:
              reject(new Error('获取位置超时'))
              break
            default:
              reject(new Error('获取位置失败'))
              break
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5分钟缓存
        }
      )
    })
  }

  // 同步位置
  const handleLocationSync = async () => {
    if (isLoading || status?.currentUserSynced) return

    setIsLoading(true)
    setSyncError('')
    setLocationError('')

    try {
      // 获取地理位置
      const position = await getCurrentLocation()
      const { latitude, longitude } = position.coords

      // 发送同步请求
      const response = await fetch(getApiPath('/location/sync'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude,
          mood_emoji: selectedMood || null
        })
      })

      const result = await response.json()

      if (result.success) {
        // 刷新状态
        await mutate(getApiPath('/location/status'))
        setShowMoodSelector(false)
        setSelectedMood('')
      } else {
        setSyncError(result.error || '同步失败')
      }
    } catch (error) {
      if (error instanceof Error) {
        setLocationError(error.message)
      } else {
        setSyncError('同步过程中出现问题')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 渲染不同状态的UI
  const renderContent = () => {
    if (statusLoading) {
      return (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-warm-muted/50 rounded-full mb-4">
            <Loader2 className="w-8 h-8 text-warm-text/50 animate-spin" />
          </div>
          <h2 className="text-2xl font-serif text-warm-text mb-2">加载中...</h2>
        </div>
      )
    }

    if (!status) {
      return (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-serif text-warm-text mb-2">加载失败</h2>
          <p className="text-warm-text/70">请刷新页面重试</p>
        </div>
      )
    }

    // 双方都已同步 - 显示距离
    if (status.bothSynced) {
      return (
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-6"
          >
            <Heart className="w-10 h-10 text-primary-500 fill-current" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-4xl font-serif text-primary-500 font-bold">
              {status.distance} 公里
            </h2>
            <p className="text-lg text-warm-text/80">是此刻我们心的距离</p>
            
            {/* 显示双方心情 */}
            {(status.himLocation?.mood_emoji || status.herLocation?.mood_emoji) && (
              <div className="flex items-center justify-center space-x-6 mt-6">
                {status.himLocation?.mood_emoji && (
                  <div className="flex flex-col items-center">
                    <div className="text-2xl mb-1">{status.himLocation.mood_emoji}</div>
                    <div className="text-xs text-warm-text/60">他</div>
                  </div>
                )}
                {status.herLocation?.mood_emoji && (
                  <div className="flex flex-col items-center">
                    <div className="text-2xl mb-1">{status.herLocation.mood_emoji}</div>
                    <div className="text-xs text-warm-text/60">她</div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )
    }

    // 当前用户已同步，等待对方
    if (status.currentUserSynced) {
      return (
        <div className="text-center">
          <motion.div
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4"
          >
            <div className="w-8 h-8 rounded-full bg-primary-500" style={{
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
            }} />
          </motion.div>
          
          <h2 className="text-2xl font-serif text-warm-text mb-2">你的足迹已同步</h2>
          <p className="text-warm-text/70 animate-pulse-soft">{status.distanceMessage}</p>
        </div>
      )
    }

    // 双方都未同步 - 显示同步按钮
    return (
      <div className="text-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4"
        >
          <MapPin className="w-8 h-8 text-primary-500" />
        </motion.div>
        
        <h2 className="text-2xl font-serif text-warm-text mb-2">今天，你在哪儿？</h2>
        <p className="text-warm-text/70 mb-6">等待你们的同步...</p>

        {/* 心情选择器 */}
        {showMoodSelector && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <p className="text-sm text-warm-text/70 mb-3">今天心情怎么样？</p>
            <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
              {MOOD_EMOJIS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedMood(selectedMood === emoji ? '' : emoji)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedMood === emoji
                      ? 'border-primary-500 bg-primary-50 scale-110'
                      : 'border-warm-muted hover:border-primary-300'
                  }`}
                  title={label}
                >
                  <span className="text-xl">{emoji}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          {!showMoodSelector && (
            <button
              onClick={() => setShowMoodSelector(true)}
              className="flex items-center justify-center space-x-2 mx-auto text-primary-500 hover:text-primary-600 transition-colors"
            >
              <Smile className="w-4 h-4" />
              <span className="text-sm">添加今日心情</span>
            </button>
          )}

          <button
            onClick={handleLocationSync}
            disabled={isLoading}
            className="bg-primary-500 hover:bg-primary-600 disabled:bg-warm-muted disabled:cursor-not-allowed text-warm-paper font-medium py-3 px-8 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>同步中...</span>
              </div>
            ) : (
              '同步我的足迹'
            )}
          </button>
        </div>

        {/* 错误提示 */}
        <AnimatePresence>
          {(syncError || locationError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg"
            >
              {locationError || syncError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="bg-warm-paper rounded-2xl p-8 shadow-lg border border-warm-muted"
    >
      {renderContent()}
    </motion.div>
  )
}