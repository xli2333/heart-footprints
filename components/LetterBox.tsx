'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Edit3, X, Clock, Send, Calendar, Loader2, MailOpen, Trash2, Reply, Paperclip, Mic } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import { formatRelativeTime } from '@/lib/utils'
import { getApiPath } from '@/lib/api-config'
import { ChatInput } from '@/components/ui/chat-input'
import { Button } from '@/components/ui/button'

interface Letter {
  id: string
  title?: string
  content: string
  reply_to?: string
  created_at: string
  scheduled_delivery_at?: string
  is_read: boolean
  is_sent_by_user: boolean
}


interface LetterData {
  letters: Letter[]
  unreadCount: number
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function LetterBox() {
  const [currentTab, setCurrentTab] = useState<'inbox' | 'sent'>('inbox')
  const [showWriter, setShowWriter] = useState(false)
  const [showReader, setShowReader] = useState(false)
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null)
  const [replyToLetter, setReplyToLetter] = useState<Letter | null>(null)
  const [conversationThread, setConversationThread] = useState<any[]>([])

  // Writer 相关状态
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isReply, setIsReply] = useState(false)

  // 获取收件箱数据
  const { data: inboxData, isLoading: inboxLoading } = useSWR<{
    success: boolean
    data: LetterData
  }>(getApiPath('/letters?type=inbox'), fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true
  })

  const { data: sentData, isLoading: sentLoading } = useSWR<{
    success: boolean
    data: LetterData
  }>(getApiPath('/letters?type=sent'), fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true
  })

  const currentData = currentTab === 'inbox' ? inboxData?.data : sentData?.data
  const isLoading = currentTab === 'inbox' ? inboxLoading : sentLoading
  const unreadCount = inboxData?.data?.unreadCount || 0

  // 发送信件
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError('信件内容不能为空')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      let scheduledDelivery = null
      
      if (isScheduled && scheduleDate && scheduleTime) {
        const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`)
        if (scheduledDateTime <= new Date()) {
          setError('定时发送时间必须是未来的时间')
          return
        }
        scheduledDelivery = scheduledDateTime.toISOString()
      }

      const response = await fetch(getApiPath('/letters'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim(),
          scheduled_delivery_at: scheduledDelivery,
          reply_to: replyToLetter?.id || null
        })
      })

      const result = await response.json()

      if (result.success) {
        // 刷新数据
        await Promise.all([
          mutate(getApiPath('/letters?type=inbox')),
          mutate(getApiPath('/letters?type=sent'))
        ])
        // 重置表单
        resetWriter()
      } else {
        setError(result.error || '发送失败')
      }
    } catch (error) {
      setError('发送过程中出现问题')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 标记为已读
  const markAsRead = async (letter: Letter) => {
    if (letter.is_read) return

    try {
      await fetch(`${getApiPath('/letters')}/${letter.id}`, {
        method: 'PUT'
      })
      // 刷新数据
      await mutate(getApiPath('/letters?type=inbox'))
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  // 删除信件 (只能删除自己发送的)
  const deleteLetter = async (letter: Letter) => {
    if (!letter.is_sent_by_user) return

    try {
      const response = await fetch(`${getApiPath('/letters')}/${letter.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await mutate(getApiPath('/letters?type=sent'))
        setShowReader(false)
        setSelectedLetter(null)
      }
    } catch (error) {
      console.error('Delete letter error:', error)
    }
  }

  const resetWriter = () => {
    setTitle('')
    setContent('')
    setIsScheduled(false)
    setScheduleDate('')
    setScheduleTime('')
    setError('')
    setIsReply(false)
    setReplyToLetter(null)
    setShowWriter(false)
  }

  const openLetter = async (letter: Letter) => {
    setSelectedLetter(letter)
    setShowReader(true)
    
    // 如果是未读信件，标记为已读
    if (!letter.is_read && !letter.is_sent_by_user) {
      await markAsRead(letter)
    }
    
    // 获取完整对话线程
    await fetchConversationThread(letter)
  }
  
  // 获取完整对话线程
  const fetchConversationThread = async (letter: Letter) => {
    try {
      console.log('获取信件对话线程:', letter.id)
      const response = await fetch(`${getApiPath('/letters')}/${letter.id}/thread`)
      const result = await response.json()
      
      console.log('API 响应:', result)
      
      if (result.success && result.data.thread) {
        console.log('设置对话线程:', result.data.thread)
        setConversationThread(result.data.thread)
      } else {
        console.log('API 返回失败或无数据，使用当前信件')
        // 如果获取失败，至少显示当前信件
        setConversationThread([{
          ...letter,
          sender_name: letter.is_sent_by_user ? '我' : '对方',
          is_sent_by_current_user: letter.is_sent_by_user,
          is_read: letter.is_read,
          thread_level: 0
        }])
      }
    } catch (error) {
      console.error('获取对话线程失败:', error)
      // 如果获取失败，至少显示当前信件
      setConversationThread([{
        ...letter,
        sender_name: letter.is_sent_by_user ? '我' : '对方',
        is_sent_by_current_user: letter.is_sent_by_user,
        is_read: letter.is_read,
        thread_level: 0
      }])
    }
  }


  // 开始回信
  const startReply = (letter: Letter) => {
    setReplyToLetter(letter)
    setIsReply(true)
    setContent('')
    setShowWriter(true)
    setShowReader(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const currentTime = new Date().toTimeString().slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-800 mb-2">时光信札</h1>
          <p className="text-amber-600">寄一封信给未来，收一份来自过往的温暖</p>
        </div>

        {/* 写信按钮 */}
        <div className="flex justify-center mb-6">
          <motion.button
            onClick={() => setShowWriter(!showWriter)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Edit3 className="w-5 h-5" />
            写信
          </motion.button>
        </div>

        {/* Tab切换 */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setCurrentTab('inbox')}
              className={`px-6 py-2 rounded-md transition-all duration-300 flex items-center gap-2 ${
                currentTab === 'inbox'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-amber-700 hover:bg-amber-100'
              }`}
            >
              <MailOpen className="w-4 h-4" />
              收件箱
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('sent')}
              className={`px-6 py-2 rounded-md transition-all duration-300 flex items-center gap-2 ${
                currentTab === 'sent'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-amber-700 hover:bg-amber-100'
              }`}
            >
              <Send className="w-4 h-4" />
              发件箱
            </button>
          </div>
        </div>

        {/* 信件列表 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
              <p className="mt-2 text-amber-600">加载中...</p>
            </div>
          ) : !currentData?.letters?.length ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 mx-auto text-amber-300 mb-4" />
              <p className="text-amber-600">
                {currentTab === 'inbox' ? '还没有收到任何信件' : '还没有发送任何信件'}
              </p>
            </div>
          ) : (
            currentData.letters.map((letter) => (
              <motion.div
                key={letter.id}
                className={`bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${
                  !letter.is_read && !letter.is_sent_by_user ? 'ring-2 ring-amber-300' : ''
                }`}
                onClick={() => openLetter(letter)}
                whileHover={{ scale: 1.02 }}
                layout
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {!letter.is_read && !letter.is_sent_by_user && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          未读
                        </span>
                      )}
                      {letter.reply_to && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Reply className="w-3 h-3" />
                          回信
                        </span>
                      )}
                      {letter.scheduled_delivery_at && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          定时
                        </span>
                      )}
                      <span className="text-sm text-amber-600">
                        {formatRelativeTime(letter.created_at)}
                      </span>
                    </div>
                    {letter.title && (
                      <h3 className="font-semibold text-amber-800 mb-2">{letter.title}</h3>
                    )}
                    <p className="text-amber-700 line-clamp-2">
                      {letter.content}
                    </p>
                  </div>
                  <Mail className="w-6 h-6 text-amber-400 ml-4 flex-shrink-0" />
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* 现代聊天样式写信面板 */}
        <AnimatePresence>
          {showWriter && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gradient-to-b from-amber-50 to-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                {/* 聊天样式头部 */}
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">
                        {isReply ? '回信' : '写信'}
                      </h2>
                      {isReply && (
                        <p className="text-xs text-white/80">
                          回复信件
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={resetWriter}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* 回信上下文显示 */}
                {isReply && replyToLetter && (
                  <div className="bg-amber-50/50 border-b border-amber-100 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-amber-700">TA</span>
                      </div>
                      <div className="flex-1 bg-white rounded-lg p-3 shadow-sm">
                        <div className="text-sm text-gray-600 mb-1">
                          {formatRelativeTime(replyToLetter.created_at)}
                        </div>
                        <p className="text-gray-800 text-sm line-clamp-3">
                          {replyToLetter.content}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 聊天输入区域 */}
                <div className="flex-1 flex flex-col">
                  <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                    {/* 标题输入 - 简化样式 */}
                    {!isReply && (
                      <div className="p-4 border-b border-gray-100">
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="信件主题（可选）"
                        />
                      </div>
                    )}

                    {/* 消息输入框 */}
                    <div className="flex-1 p-4">
                      <div className="relative h-full">
                        <ChatInput
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder={isReply ? "输入回复内容..." : "在这里写下你想说的话..."}
                          className="w-full h-full min-h-[200px] resize-none border border-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                          required
                        />
                      </div>
                    </div>

                    {/* 定时发送选项 */}
                    <div className="px-4 py-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          id="scheduled"
                          checked={isScheduled}
                          onChange={(e) => setIsScheduled(e.target.checked)}
                          className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                        />
                        <label htmlFor="scheduled" className="text-sm text-gray-700 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          定时发送
                        </label>
                      </div>

                      {isScheduled && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            min={today}
                            className="px-3 py-2 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            required={isScheduled}
                          />
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            min={scheduleDate === today ? currentTime : undefined}
                            className="px-3 py-2 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            required={isScheduled}
                          />
                        </div>
                      )}
                    </div>

                    {/* 错误提示 */}
                    {error && (
                      <div className="mx-4 mb-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                        {error}
                      </div>
                    )}

                    {/* 聊天样式底部工具栏 */}
                    <div className="bg-white border-t border-gray-100 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" type="button" className="text-gray-400 hover:text-amber-500">
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" type="button" className="text-gray-400 hover:text-amber-500">
                            <Mic className="w-4 h-4" />
                          </Button>
                          {isScheduled && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              定时
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={resetWriter}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            取消
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSubmitting || !content.trim()}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-full flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                发送中
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                发送
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 流式对话阅读面板 */}
        <AnimatePresence>
          {showReader && selectedLetter && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gradient-to-b from-amber-50 to-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                {/* 聊天样式头部 */}
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">信件对话</h2>
                      <p className="text-xs text-white/80">
                        {conversationThread.length} 条消息
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedLetter.is_sent_by_user && (
                      <button
                        onClick={() => startReply(selectedLetter)}
                        className="flex items-center gap-1 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-sm"
                      >
                        <Reply className="w-4 h-4" />
                        回信
                      </button>
                    )}
                    {selectedLetter.is_sent_by_user && (
                      <button
                        onClick={() => deleteLetter(selectedLetter)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        title="删除信件"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowReader(false)
                        setSelectedLetter(null)
                        setConversationThread([])
                      }}
                      className="text-white/80 hover:text-white transition-colors p-1"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* 显示第一封信的主题 */}
                {conversationThread.length > 0 && conversationThread[0].title && (
                  <div className="bg-amber-50 border-b border-amber-100 p-4 text-center">
                    <span className="bg-amber-200 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                      主题：{conversationThread[0].title}
                    </span>
                  </div>
                )}

                {/* 流式对话内容 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversationThread.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-start gap-3 ${
                        message.is_sent_by_current_user ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* 左侧头像 */}
                      {!message.is_sent_by_current_user && (
                        <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-amber-700">
                            {message.sender_name?.charAt(0) || 'T'}
                          </span>
                        </div>
                      )}

                      {/* 消息气泡 */}
                      <div className={`max-w-[70%] ${
                        message.is_sent_by_current_user ? 'flex flex-col items-end' : 'flex flex-col items-start'
                      }`}>
                        <div className={`rounded-2xl px-4 py-3 ${
                          message.is_sent_by_current_user
                            ? 'bg-amber-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                        
                        {/* 消息元信息 */}
                        <div className="flex items-center gap-2 mt-1 px-2 text-xs text-gray-500">
                          <span>{formatRelativeTime(message.created_at)}</span>
                          {message.scheduled_delivery_at && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <Clock className="w-3 h-3" />
                              定时
                            </span>
                          )}
                          {message.is_sent_by_current_user && (
                            <span className={message.is_read ? 'text-green-500' : 'text-gray-400'}>
                              {message.is_read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 右侧头像 */}
                      {message.is_sent_by_current_user && (
                        <div className="w-8 h-8 bg-primary-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary-700">我</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* 快速回复区域 */}
                {!selectedLetter.is_sent_by_user && (
                  <div className="bg-white border-t border-gray-100 p-4">
                    <button
                      onClick={() => startReply(selectedLetter)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-colors"
                    >
                      <Reply className="w-4 h-4" />
                      快速回复
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}