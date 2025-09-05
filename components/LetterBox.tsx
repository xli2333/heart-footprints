'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Edit3, X, Clock, Send, Calendar, Loader2, MailOpen, Trash2, Reply, MessageCircle, Paperclip, Mic, CornerDownLeft } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import { formatRelativeTime } from '@/lib/utils'
import { getApiPath } from '@/lib/api-config'
import { ChatMessageList } from '@/components/ui/chat-message-list'
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat-bubble'
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

interface LetterThread {
  id: string
  sender_id: 'him' | 'her'
  title?: string
  content: string
  reply_to?: string
  created_at: string
  delivered_at?: string
  read_at?: string
  scheduled_delivery_at?: string
  thread_level: number
  is_delivered: boolean
  is_read: boolean
  sender_name: string
  is_sent_by_current_user: boolean
  receiver_name: string
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
  const [showThreadView, setShowThreadView] = useState(false)
  const [currentThread, setCurrentThread] = useState<LetterThread[]>([])
  const [replyToLetter, setReplyToLetter] = useState<Letter | null>(null)

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
  }

  // 获取对话线程
  const fetchLetterThread = async (letter: Letter) => {
    try {
      const response = await fetch(`${getApiPath('/letters')}/${letter.id}/thread`)
      const result = await response.json()
      
      if (result.success) {
        setCurrentThread(result.data.thread)
        setShowThreadView(true)
        setShowReader(false)
      }
    } catch (error) {
      console.error('获取对话线程失败:', error)
    }
  }

  // 开始回信
  const startReply = (letter: Letter) => {
    setReplyToLetter(letter)
    setIsReply(true)
    setContent(`@${letter.is_sent_by_user ? '对方' : '我'}: "${letter.content.slice(0, 50)}${letter.content.length > 50 ? '...' : ''}"\n\n我想回复：\n`)
    setShowWriter(true)
    setShowReader(false)
    setShowThreadView(false)
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

        {/* 写信面板 */}
        <AnimatePresence>
          {showWriter && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-amber-800">
                      {isReply ? '回信' : '写一封信'}
                    </h2>
                    <button
                      onClick={resetWriter}
                      className="text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* 回信提示 */}
                  {isReply && replyToLetter && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Reply className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-700">回复信件</span>
                      </div>
                      <p className="text-sm text-amber-600 line-clamp-2">
                        "{replyToLetter.content}"
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 标题 */}
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">
                        信件标题 (可选)
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="给这封信起个标题..."
                      />
                    </div>

                    {/* 内容 */}
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">
                        信件内容 *
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-48 px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                        placeholder="在这里写下你想说的话..."
                        required
                      />
                    </div>

                    {/* 定时发送 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="scheduled"
                          checked={isScheduled}
                          onChange={(e) => setIsScheduled(e.target.checked)}
                          className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                        />
                        <label htmlFor="scheduled" className="text-sm font-medium text-amber-700 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          定时发送
                        </label>
                      </div>

                      {isScheduled && (
                        <div className="grid grid-cols-2 gap-4 ml-6">
                          <div>
                            <label className="block text-xs text-amber-600 mb-1">日期</label>
                            <input
                              type="date"
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              min={today}
                              className="w-full px-3 py-2 text-sm border border-amber-200 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              required={isScheduled}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-amber-600 mb-1">时间</label>
                            <input
                              type="time"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              min={scheduleDate === today ? currentTime : undefined}
                              className="w-full px-3 py-2 text-sm border border-amber-200 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              required={isScheduled}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 错误提示 */}
                    {error && (
                      <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                        {error}
                      </div>
                    )}

                    {/* 按钮 */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={resetWriter}
                        className="flex-1 px-4 py-2 text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !content.trim()}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            发送中...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            {isScheduled ? '定时发送' : '立即发送'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 阅读面板 */}
        <AnimatePresence>
          {showReader && selectedLetter && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Mail className="w-6 h-6 text-amber-500" />
                      <span className="text-sm text-amber-600">
                        {formatRelativeTime(selectedLetter.created_at)}
                      </span>
                      {selectedLetter.scheduled_delivery_at && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          定时发送
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!selectedLetter.is_sent_by_user && (
                        <>
                          <button
                            onClick={() => startReply(selectedLetter)}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 transition-colors"
                            title="回信"
                          >
                            <Reply className="w-4 h-4" />
                            回信
                          </button>
                          <button
                            onClick={() => fetchLetterThread(selectedLetter)}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                            title="查看对话"
                          >
                            <MessageCircle className="w-4 h-4" />
                            对话
                          </button>
                        </>
                      )}
                      {selectedLetter.is_sent_by_user && (
                        <button
                          onClick={() => deleteLetter(selectedLetter)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="删除信件"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowReader(false)
                          setSelectedLetter(null)
                        }}
                        className="text-amber-600 hover:text-amber-800 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {selectedLetter.title && (
                    <h2 className="text-2xl font-bold text-amber-800 mb-4">
                      {selectedLetter.title}
                    </h2>
                  )}

                  <div className="prose prose-amber max-w-none">
                    <p className="text-amber-700 leading-relaxed whitespace-pre-wrap">
                      {selectedLetter.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 对话线程查看面板 */}
        <AnimatePresence>
          {showThreadView && currentThread.length > 0 && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-6 h-6 text-amber-500" />
                      <h2 className="text-2xl font-bold text-amber-800">对话线程</h2>
                      <span className="text-sm text-amber-600 px-2 py-1 bg-amber-100 rounded-full">
                        {currentThread.length} 条消息
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowThreadView(false)
                        setCurrentThread([])
                      }}
                      className="text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* 聊天式对话列表 */}
                  <div className="h-[60vh]">
                    {/* 显示第一封信的主题（如果有） */}
                    {currentThread[0] && currentThread[0].title && (
                      <div className="text-center py-2 mb-4">
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
                          主题：{currentThread[0].title}
                        </span>
                      </div>
                    )}
                    
                    <ChatMessageList smooth className="bg-gradient-to-b from-amber-50/20 to-white rounded-lg border">
                      {currentThread.map((message, index) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <ChatBubble variant={message.is_sent_by_current_user ? "sent" : "received"}>
                            <ChatBubbleAvatar
                              className="h-8 w-8 shrink-0"
                              fallback={message.sender_name.charAt(0)}
                            />
                            <ChatBubbleMessage variant={message.is_sent_by_current_user ? "sent" : "received"}>
                              <div className="space-y-1">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {message.content}
                                </p>
                                <div className="flex items-center gap-2 text-xs opacity-70">
                                  <span>{formatRelativeTime(message.created_at)}</span>
                                  {message.is_read ? (
                                    <span className="text-green-500">✓✓</span>
                                  ) : (
                                    <span>✓</span>
                                  )}
                                </div>
                              </div>
                            </ChatBubbleMessage>
                          </ChatBubble>
                        </motion.div>
                      ))}
                    </ChatMessageList>
                  </div>

                  {/* 快速回复输入框 */}
                  <div className="mt-4 border-t border-gray-200 bg-white rounded-b-lg">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        const lastMessage = currentThread[currentThread.length - 1]
                        if (lastMessage && !lastMessage.is_sent_by_current_user) {
                          startReply({
                            id: lastMessage.id,
                            title: lastMessage.title,
                            content: lastMessage.content,
                            reply_to: lastMessage.reply_to,
                            created_at: lastMessage.created_at,
                            scheduled_delivery_at: lastMessage.scheduled_delivery_at,
                            is_read: lastMessage.is_read,
                            is_sent_by_user: lastMessage.is_sent_by_current_user
                          })
                        }
                      }}
                      className="relative rounded-lg bg-background focus-within:ring-1 focus-within:ring-ring p-1"
                    >
                      <ChatInput
                        placeholder="输入回复内容..."
                        className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
                      />
                      <div className="flex items-center p-3 pt-0 justify-between">
                        <div className="flex">
                          <Button variant="ghost" size="icon" type="button">
                            <Paperclip className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" type="button">
                            <Mic className="size-4" />
                          </Button>
                        </div>
                        <Button type="submit" size="sm" className="ml-auto gap-1.5 bg-amber-500 hover:bg-amber-600">
                          回复
                          <CornerDownLeft className="size-3.5" />
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}