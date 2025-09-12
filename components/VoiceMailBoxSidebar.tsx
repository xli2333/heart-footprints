'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, Plus, MessageCircle } from 'lucide-react'
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

interface VoiceMailBoxSidebarProps {
  user: User
}

export default function VoiceMailBoxSidebar({ user }: VoiceMailBoxSidebarProps) {
  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRecorder, setShowRecorder] = useState(false)
  const [showAllMessages, setShowAllMessages] = useState(false)
  const [newMessagesCount, setNewMessagesCount] = useState(0)

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

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-warm-paper rounded-2xl p-6 shadow-lg border border-warm-muted"
      >
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-warm-text/70 text-sm">加载中...</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <>
      {/* 主要侧边栏组件 */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-warm-paper rounded-2xl p-6 shadow-lg border border-warm-muted"
      >
        {/* 标题和录制按钮 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary-500 rounded-full">
              <Mic className="w-4 h-4 text-warm-paper" />
            </div>
            <div>
              <h3 className="text-lg font-serif text-warm-text">语音信箱</h3>
              {newMessagesCount > 0 && (
                <p className="text-xs text-primary-500">
                  {newMessagesCount} 条新消息
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowRecorder(true)}
            className="flex items-center justify-center w-8 h-8 bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 消息预览 */}
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-6">
              <MessageCircle className="w-12 h-12 text-warm-text/30 mx-auto mb-2" />
              <p className="text-warm-text/60 text-sm">还没有语音消息</p>
              <button
                onClick={() => setShowRecorder(true)}
                className="text-primary-500 text-sm hover:underline mt-1"
              >
                录制第一条消息
              </button>
            </div>
          ) : (
            <>
              {/* 显示最新3条消息，按时间顺序 */}
              {messages.slice(0, 3).map((message, index) => (
                <div key={message.id} className="space-y-1">
                  <div
                    className="flex items-center space-x-3 p-3 bg-warm-bg/50 rounded-xl hover:bg-warm-bg transition-colors cursor-pointer"
                    onClick={() => setShowAllMessages(true)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-primary-500/20 rounded-full">
                      <Volume2 className="w-4 h-4 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-warm-text truncate">
                          {message.senderName}
                        </span>
                        {message.isNew && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                        )}
                      </div>
                      <div className="text-xs text-warm-text/60 flex items-center space-x-2">
                        <span>{Math.floor(message.duration)}s</span>
                        <span>•</span>
                        <span>{new Date(message.timestamp).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                  </div>
                  {/* 分隔线 */}
                  {index < Math.min(messages.length, 3) - 1 && (
                    <div className="h-px bg-warm-muted/30 mx-4"></div>
                  )}
                </div>
              ))}
              
              {/* 查看更多按钮 */}
              {messages.length > 3 && (
                <button
                  onClick={() => setShowAllMessages(true)}
                  className="w-full text-center py-2 text-primary-500 text-sm hover:underline border-t border-warm-muted/30 mt-3 pt-3"
                >
                  查看全部 {messages.length} 条消息
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* 录制器浮窗 */}
      <AnimatePresence>
        {showRecorder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowRecorder(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <VoiceRecorder
                onSend={handleSendVoice}
                onCancel={() => setShowRecorder(false)}
                maxDuration={60}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 全部消息浮窗 */}
      <AnimatePresence>
        {showAllMessages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAllMessages(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-warm-paper rounded-2xl p-6 shadow-2xl border border-warm-muted max-w-2xl w-full max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif text-warm-text">所有语音消息</h2>
                <button
                  onClick={() => setShowAllMessages(false)}
                  className="text-warm-text/50 hover:text-warm-text"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {messages.map((message) => (
                  <VoicePlayer
                    key={message.id}
                    message={message}
                    onDelete={handleDeleteMessage}
                    onDownload={handleDownloadMessage}
                    compact={true}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}