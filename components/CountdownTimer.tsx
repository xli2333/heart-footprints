'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, X, Clock, Edit2, Trash2, AlertCircle } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import { formatCountdown } from '@/lib/utils'
import { getApiPath } from '@/lib/api-config'

interface CountdownEvent {
  id: string
  title: string
  target_date: string
  background_image_url?: string
  created_at: string
  updated_at: string
}

interface CountdownData {
  activeEvents: CountdownEvent[]
  expiredEvents: CountdownEvent[]
  totalEvents: number
  hasActiveEvents: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function CountdownTimer() {
  const [showEditor, setShowEditor] = useState(false)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [targetTime, setTargetTime] = useState('00:00')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editingEvent, setEditingEvent] = useState<CountdownEvent | null>(null)
  const [countdown, setCountdown] = useState<{ [key: string]: { days: number, hours: number, minutes: number, seconds: number, isExpired: boolean } }>({})

  // 获取倒数日数据
  const { data, error: fetchError, isLoading } = useSWR<{
    success: boolean
    data: CountdownData
  }>(getApiPath('/countdown'), fetcher, {
    refreshInterval: 1000, // 每秒刷新一次
    revalidateOnFocus: true
  })

  const eventsData = data?.data

  // 更新倒数日计时器
  useEffect(() => {
    if (!eventsData?.activeEvents?.length) return

    const updateCountdowns = () => {
      const newCountdowns: { [key: string]: { days: number, hours: number, minutes: number, seconds: number, isExpired: boolean } } = {}
      
      eventsData.activeEvents.forEach(event => {
        try {
          const targetDate = new Date(event.target_date)
          if (!isNaN(targetDate.getTime())) {
            const result = formatCountdown(targetDate)
            newCountdowns[event.id] = result
          }
        } catch (error) {
          console.error(`Invalid date for event ${event.id}:`, event.target_date)
        }
      })
      
      setCountdown(newCountdowns)
    }

    updateCountdowns()
    const interval = setInterval(updateCountdowns, 1000)

    return () => clearInterval(interval)
  }, [eventsData?.activeEvents])

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !targetDate || !targetTime) {
      setError('请填写完整信息')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // 组合日期和时间
      const fullDateTime = `${targetDate}T${targetTime}:00`
      const targetDateTime = new Date(fullDateTime)

      // 验证日期是否在未来
      if (targetDateTime <= new Date()) {
        setError('目标时间必须是未来的时间')
        return
      }

      const response = await fetch(
        editingEvent 
          ? `${getApiPath('/countdown')}/${editingEvent.id}`
          : getApiPath('/countdown'),
        {
          method: editingEvent ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title.trim(),
            target_date: targetDateTime.toISOString()
          })
        }
      )

      const result = await response.json()

      if (result.success) {
        // 刷新数据
        await mutate(getApiPath('/countdown'))
        // 重置表单
        resetForm()
      } else {
        setError(result.error || '设置失败')
      }
    } catch (error) {
      setError('设置倒数日时出现问题')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除倒数日
  const handleDelete = async (eventId: string) => {
    if (!confirm('确定要删除这个倒数日吗？')) return

    try {
      const response = await fetch(`${getApiPath('/countdown')}/${eventId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await mutate(getApiPath('/countdown'))
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  // 重置表单
  const resetForm = () => {
    setTitle('')
    setTargetDate('')
    setTargetTime('00:00')
    setError('')
    setEditingEvent(null)
    setShowEditor(false)
  }

  // 编辑现有事件
  const handleEdit = (event: CountdownEvent) => {
    try {
      const date = new Date(event.target_date)
      if (isNaN(date.getTime())) {
        setError('无效的日期格式')
        return
      }
      setTitle(event.title)
      setTargetDate(date.toISOString().split('T')[0])
      setTargetTime(date.toTimeString().slice(0, 5))
      setEditingEvent(event)
      setShowEditor(true)
    } catch (error) {
      setError('日期解析失败')
    }
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-warm-paper rounded-2xl p-6 shadow-lg border border-warm-muted"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-serif text-warm-text">倒数日</h3>
        </div>
        
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-warm-muted rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-3 bg-warm-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-warm-paper rounded-2xl p-6 shadow-lg border border-warm-muted"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-serif text-warm-text">倒数日</h3>
          {eventsData?.totalEvents > 0 && (
            <span className="text-sm text-warm-text/60 px-2 py-1 bg-warm-muted/50 rounded-full">
              {eventsData.activeEvents.length} 个活跃
            </span>
          )}
        </div>
        
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center space-x-1 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">新约定</span>
        </button>
      </div>

      {/* 活跃的倒数日事件列表 */}
      {eventsData?.activeEvents?.length > 0 ? (
        <div className="space-y-4">
          {eventsData.activeEvents.map((event) => {
            const eventCountdown = countdown[event.id]
            if (!eventCountdown || eventCountdown.isExpired) return null

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary-50 to-amber-50 rounded-2xl p-4 border border-primary-100"
              >
                {/* 事件头部 */}
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-serif text-warm-text">{event.title}</h4>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(event)}
                      className="p-1 text-warm-text/60 hover:text-primary-500 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-1 text-warm-text/60 hover:text-red-500 transition-colors ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 倒数日显示 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { value: eventCountdown.days, label: '天' },
                    { value: eventCountdown.hours, label: '小时' },
                    { value: eventCountdown.minutes, label: '分钟' },
                    { value: eventCountdown.seconds, label: '秒' }
                  ].map(({ value, label }, index) => (
                    <motion.div
                      key={label}
                      animate={{ scale: label === '秒' ? [1, 1.05, 1] : 1 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="bg-white rounded-lg p-3 text-center shadow-sm"
                    >
                      <div className="text-xl font-bold text-primary-500 font-mono">
                        {value.toString().padStart(2, '0')}
                      </div>
                      <div className="text-xs text-warm-text/70">{label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* 目标日期 */}
                <p className="text-sm text-warm-text/70 text-center">
                  {(() => {
                    try {
                      const targetDate = new Date(event.target_date)
                      if (isNaN(targetDate.getTime())) {
                        return '日期格式错误'
                      }
                      return targetDate.toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    } catch {
                      return '日期解析错误'
                    }
                  })()}
                </p>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* 没有活跃倒数日 */
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-warm-text/30 mx-auto mb-3" />
          <p className="text-warm-text/70 mb-4">还没有新的约定哦</p>
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center space-x-2 mx-auto text-primary-500 hover:text-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">设置新约定</span>
          </button>
        </div>
      )}

      {/* 过期的事件（简单展示） */}
      {eventsData?.expiredEvents?.length > 0 && (
        <div className="mt-6 pt-4 border-t border-warm-muted/50">
          <h4 className="text-sm font-medium text-warm-text/60 mb-2 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>已完成的约定</span>
          </h4>
          <div className="space-y-2">
            {eventsData.expiredEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="text-sm text-warm-text/50 flex items-center justify-between">
                <span>{event.title}</span>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="text-warm-text/40 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 设置倒数日模态框 */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && resetForm()}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-warm-paper rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-serif text-warm-text">
                  {editingEvent ? '编辑约定' : '设置新约定'}
                </h4>
                <button
                  onClick={resetForm}
                  className="text-warm-text/70 hover:text-warm-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 表单 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-warm-text mb-2">
                    约定名称
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：我们的厦门之旅"
                    className="w-full p-3 border border-warm-muted rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    maxLength={50}
                    required
                  />
                  <div className="text-right text-xs text-warm-text/50 mt-1">
                    {title.length}/50
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-text mb-2">
                    目标日期
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border border-warm-muted rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-text mb-2">
                    目标时间
                  </label>
                  <input
                    type="time"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="w-full p-3 border border-warm-muted rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg">
                    {error}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-3 px-4 bg-warm-muted text-warm-text rounded-lg hover:bg-warm-muted/80 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !targetDate || !targetTime}
                    className="flex-1 py-3 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-warm-muted text-warm-paper rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '设置中...' : (editingEvent ? '更新约定' : '约定好了')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}