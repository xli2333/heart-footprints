'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Heart, Loader2, Smile, AlertCircle, BarChart3, Calendar, TrendingUp, X } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import { getApiPath } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import dynamic from 'next/dynamic'

const LocationMap = dynamic(() => import('./LocationMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl flex items-center justify-center">
      <div className="flex items-center gap-2 text-pink-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">地图加载中...</span>
      </div>
    </div>
  )
})

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

interface HistoryRecord {
  date: string
  distance: number
  himLocation: {
    latitude: number
    longitude: number
    mood_emoji?: string
  }
  herLocation: {
    latitude: number
    longitude: number
    mood_emoji?: string
  }
}

interface HistoryData {
  history: HistoryRecord[]
  stats: {
    averageDistance: number
    minDistance: number
    maxDistance: number
    totalRecords: number
  }
  hasMore: boolean
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
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMood, setSelectedMood] = useState<string>('')
  const [showHistory, setShowHistory] = useState(false)
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

  // 获取历史距离数据
  const { data: historyData, isLoading: historyLoading } = useSWR<{
    success: boolean
    data: HistoryData
  }>(showHistory ? getApiPath('/location/history?limit=30') : null, fetcher)

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

    // 双方都已同步 - 显示距离和地图
    if (status.bothSynced) {
      return (
        <div className="space-y-6">
          {/* 距离信息 */}
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4"
            >
              <Heart className="w-8 h-8 text-primary-500 fill-current" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <h2 className="text-3xl font-serif text-primary-500 font-bold">
                {status.distance} 公里
              </h2>
              <p className="text-warm-text/80">是此刻我们心的距离</p>
            </motion.div>
          </div>

          {/* 地图显示 */}
          <LocationMap
            himLocation={status.himLocation}
            herLocation={status.herLocation}
            distance={status.distance}
            className="mx-auto max-w-2xl"
          />
          
          {/* 显示双方心情 */}
          {(status.himLocation?.mood_emoji || status.herLocation?.mood_emoji) && (
            <div className="flex items-center justify-center space-x-8 pt-2">
              {status.himLocation?.mood_emoji && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="text-2xl mb-1">{status.himLocation.mood_emoji}</div>
                  <div className="text-xs text-warm-text/60 font-medium">
                    {process.env.NEXT_PUBLIC_USER_HIM_NAME || '他'}
                  </div>
                </motion.div>
              )}
              {status.herLocation?.mood_emoji && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className="text-2xl mb-1">{status.herLocation.mood_emoji}</div>
                  <div className="text-xs text-warm-text/60 font-medium">
                    {process.env.NEXT_PUBLIC_USER_HER_NAME || '她'}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )
    }

    // 当前用户已同步，等待对方 - 显示当前用户的地图位置
    if (status.currentUserSynced) {
      // 确定当前用户的位置
      const currentUserLocation = user?.id === 'him' ? status.himLocation : status.herLocation
      
      return (
        <div className="space-y-6">
          {/* 等待状态提示 */}
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

          {/* 显示当前用户的地图位置 */}
          {currentUserLocation && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-warm-text/90 mb-2">📍 我的位置</h3>
              </div>
              
              <LocationMap
                himLocation={user?.id === 'him' ? currentUserLocation : null}
                herLocation={user?.id === 'her' ? currentUserLocation : null}
                distance={null}
                className="mx-auto max-w-2xl"
              />
              
              {/* 显示当前用户心情 */}
              {currentUserLocation.mood_emoji && (
                <div className="flex items-center justify-center pt-2">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="text-2xl mb-1">{currentUserLocation.mood_emoji}</div>
                    <div className="text-xs text-warm-text/60 font-medium">我</div>
                  </motion.div>
                </div>
              )}
            </div>
          )}
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="bg-warm-paper rounded-2xl p-8 shadow-lg border border-warm-muted"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-primary-500" />
            <h3 className="text-xl font-serif text-warm-text">今日之约</h3>
          </div>
          <motion.button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-all duration-200 text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <BarChart3 className="w-4 h-4" />
            <span>历史距离</span>
          </motion.button>
        </div>

        {renderContent()}
      </motion.div>

      {/* 历史距离弹窗 */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-warm-paper rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-xl"
            >
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-6 h-6 text-primary-500" />
                  <h4 className="text-xl font-serif text-warm-text">距离历史记录</h4>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-warm-text/70 hover:text-warm-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 内容区域 */}
              {historyLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
                  <p className="text-warm-text/70">加载历史数据...</p>
                </div>
              ) : historyData?.data ? (
                <div className="space-y-6">
                  {/* 统计信息 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-amber-50 rounded-xl">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-700">{historyData.data.stats.totalRecords}</p>
                      <p className="text-sm text-amber-600">记录天数</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-700">{historyData.data.stats.averageDistance}km</p>
                      <p className="text-sm text-amber-600">平均距离</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{historyData.data.stats.minDistance}km</p>
                      <p className="text-sm text-amber-600">最近距离</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">{historyData.data.stats.maxDistance}km</p>
                      <p className="text-sm text-amber-600">最远距离</p>
                    </div>
                  </div>

                  {/* 历史记录表格 */}
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-warm-paper">
                        <tr className="border-b border-warm-muted">
                          <th className="text-left py-3 px-4 font-medium text-warm-text">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>日期</span>
                            </div>
                          </th>
                          <th className="text-center py-3 px-4 font-medium text-warm-text">距离(km)</th>
                          <th className="text-center py-3 px-4 font-medium text-warm-text">他的心情</th>
                          <th className="text-center py-3 px-4 font-medium text-warm-text">她的心情</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.data.history.map((record, index) => (
                          <motion.tr
                            key={record.date}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-warm-muted/50 hover:bg-warm-bg/50 transition-colors"
                          >
                            <td className="py-3 px-4 text-warm-text">{record.date}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`font-bold ${
                                record.distance < 10 ? 'text-green-600' :
                                record.distance < 100 ? 'text-amber-600' : 'text-red-500'
                              }`}>
                                {record.distance}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-2xl">
                              {record.himLocation.mood_emoji || '😐'}
                            </td>
                            <td className="py-3 px-4 text-center text-2xl">
                              {record.herLocation.mood_emoji || '😐'}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 距离趋势简单可视化 */}
                  <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl">
                    <h5 className="text-lg font-medium text-warm-text mb-4 flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-primary-500" />
                      <span>距离趋势</span>
                    </h5>
                    <div className="flex items-end space-x-1 h-32 overflow-x-auto">
                      {historyData.data.history.slice(0, 20).reverse().map((record, index) => {
                        const maxDistance = Math.max(...historyData.data.history.map(r => r.distance))
                        const height = Math.max((record.distance / maxDistance) * 100, 5)
                        return (
                          <motion.div
                            key={record.date}
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-gradient-to-t from-primary-500 to-primary-300 min-w-[12px] rounded-t-sm relative group"
                            title={`${record.date}: ${record.distance}km`}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {record.date.split('-')[2]}月{record.date.split('-')[1]}日: {record.distance}km
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                    <p className="text-sm text-warm-text/60 mt-2">最近20天的距离变化</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-warm-text/30 mx-auto mb-4" />
                  <p className="text-warm-text/70">暂无历史记录</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}