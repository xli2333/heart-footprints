'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MessageSquare, Plus, Filter, Search, MoreVertical } from 'lucide-react'
import { User } from '@/types/database'
import VoiceRecorder from './VoiceRecorder'
import VoicePlayer from './VoicePlayer'

interface VoiceMessage {
  id: string
  audioUrl: string
  duration: number
  timestamp: string
  sender: string
  senderName: string
  recipient: string
  recipientName: string
  isNew?: boolean
}

interface VoiceMailBoxProps {
  user: User
}

export default function VoiceMailBox({ user }: VoiceMailBoxProps) {
  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRecorder, setShowRecorder] = useState(false)
  const [filterBy, setFilterBy] = useState<'all' | 'sent' | 'received'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessagesCount, setNewMessagesCount] = useState(0)

  // 标记消息为已读
  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/voice-messages/${messageId}`, {
        method: 'PATCH'
      })
      // 更新本地状态
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isNew: false } : msg
      ))
      setNewMessagesCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('标记消息已读失败:', error)
    }
  }

  // 获取语音消息列表
  useEffect(() => {
    const fetchVoiceMessages = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/voice-messages')
        const data = await response.json()
        
        if (data.success) {
          setMessages(data.data || [])
          // 计算新消息数量
          const newCount = data.data?.filter((msg: VoiceMessage) => 
            msg.recipient === user.role && msg.isNew
          ).length || 0
          setNewMessagesCount(newCount)
        }
      } catch (error) {
        console.error('获取语音消息失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVoiceMessages()
  }, [user.role])

  // 发送语音消息
  const handleSendVoice = async (audioBlob: Blob, duration: number) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, `voice-${Date.now()}.webm`)
      formData.append('duration', duration.toString())
      formData.append('sender', user.role)
      formData.append('recipient', user.role === 'him' ? 'her' : 'him')

      const response = await fetch('/api/voice-messages', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (data.success) {
        // 添加新消息到列表顶部
        setMessages(prev => [data.data, ...prev])
        setShowRecorder(false)
      } else {
        alert('发送语音消息失败')
      }
    } catch (error) {
      console.error('发送语音消息失败:', error)
      alert('发送语音消息失败')
    }
  }

  // 删除语音消息
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('确定要删除这条语音消息吗？')) return

    try {
      const response = await fetch(`/api/voice-messages/${messageId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId))
      } else {
        alert('删除消息失败')
      }
    } catch (error) {
      console.error('删除消息失败:', error)
      alert('删除消息失败')
    }
  }

  // 下载语音消息
  const handleDownloadMessage = async (messageId: string) => {
    try {
      const message = messages.find(msg => msg.id === messageId)
      if (!message) return

      const response = await fetch(message.audioUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `voice-message-${messageId}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载消息失败:', error)
      alert('下载失败')
    }
  }

  // 过滤消息
  const filteredMessages = messages.filter(message => {
    const matchesFilter = 
      filterBy === 'all' || 
      (filterBy === 'sent' && message.sender === user.role) ||
      (filterBy === 'received' && message.recipient === user.role)
    
    const matchesSearch = 
      searchTerm === '' ||
      message.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.recipientName.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-warm-paper rounded-2xl p-6 shadow-lg border border-warm-muted"
      >
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-warm-text/70">加载语音消息...</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题和新建按钮 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-warm-paper rounded-2xl p-6 shadow-lg border border-warm-muted"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-500 rounded-full">
              <Mic className="w-5 h-5 text-warm-paper" />
            </div>
            <div>
              <h2 className="text-xl font-serif text-warm-text">语音信箱</h2>
              <p className="text-sm text-warm-text/60">
                {newMessagesCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary-500 text-white mr-2">
                    {newMessagesCount} 条新消息
                  </span>
                )}
                用声音传递真心话
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowRecorder(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>录制</span>
          </button>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-warm-text/50" />
            <input
              type="text"
              placeholder="搜索消息..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-warm-bg border border-warm-muted rounded-lg text-warm-text placeholder-warm-text/50 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterBy('all')}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                filterBy === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-warm-bg text-warm-text hover:bg-warm-muted'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterBy('sent')}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                filterBy === 'sent'
                  ? 'bg-primary-500 text-white'
                  : 'bg-warm-bg text-warm-text hover:bg-warm-muted'
              }`}
            >
              已发送
            </button>
            <button
              onClick={() => setFilterBy('received')}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                filterBy === 'received'
                  ? 'bg-primary-500 text-white'
                  : 'bg-warm-bg text-warm-text hover:bg-warm-muted'
              }`}
            >
              已接收
            </button>
          </div>
        </div>
      </motion.div>

      {/* 录制器 */}
      <AnimatePresence>
        {showRecorder && (
          <VoiceRecorder
            onSend={handleSendVoice}
            onCancel={() => setShowRecorder(false)}
            maxDuration={60}
          />
        )}
      </AnimatePresence>

      {/* 消息列表 */}
      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-warm-paper rounded-2xl p-8 shadow-lg border border-warm-muted text-center"
          >
            <MessageSquare className="w-16 h-16 text-warm-text/30 mx-auto mb-4" />
            <h3 className="text-lg font-serif text-warm-text mb-2">暂无语音消息</h3>
            <p className="text-warm-text/60 mb-4">
              {searchTerm || filterBy !== 'all' 
                ? '没有找到匹配的消息' 
                : '开始录制你们的第一条语音消息吧'
              }
            </p>
            {!searchTerm && filterBy === 'all' && (
              <button
                onClick={() => setShowRecorder(true)}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                开始录制
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {filteredMessages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${
                  message.sender === user.role 
                    ? 'ml-8' 
                    : 'mr-8'
                }`}
              >
                {message.isNew && message.recipient === user.role && (
                  <div className="text-xs text-primary-500 font-medium mb-1 px-2">
                    新消息
                  </div>
                )}
                <VoicePlayer
                  message={message}
                  onDelete={handleDeleteMessage}
                  onDownload={handleDownloadMessage}
                  onPlay={message.recipient === user.role && message.isNew ? () => markAsRead(message.id) : undefined}
                />
                {message.sender === user.role && (
                  <div className="text-xs text-warm-text/50 mt-1 px-2 text-right">
                    发送给 {message.recipientName}
                  </div>
                )}
                {message.recipient === user.role && (
                  <div className="text-xs text-warm-text/50 mt-1 px-2">
                    来自 {message.senderName}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 使用提示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-warm-paper/50 rounded-xl p-4 text-center"
      >
        <p className="text-sm text-warm-text/60">
          💡 语音消息最长可录制 60 秒，支持播放、下载和删除
        </p>
      </motion.div>
    </div>
  )
}