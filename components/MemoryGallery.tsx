'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Loader2, Heart, Plus, MessageCircle, Sparkles, Send, Reply, Edit2, Trash2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import useSWR, { mutate } from 'swr'
import { formatRelativeTime } from '@/lib/utils'
import { getApiPath } from '@/lib/api-config'
import { MemoryWithStats, Comment } from '@/types/database'
import { useAuth } from '@/lib/auth-context'

interface Memory {
  id: string
  user_id: 'him' | 'her'
  image_url: string
  description: string
  uploader_name: string
  created_at: string
  like_count?: number
  comment_count?: number
  liked_by_him?: boolean
  liked_by_her?: boolean
}

interface MemoryData {
  memories: Memory[]
  total: number
  hasMore: boolean
  currentPage: number
  totalPages: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function MemoryGallery() {
  const { user } = useAuth()
  const [showUploader, setShowUploader] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [memoryComments, setMemoryComments] = useState<Record<string, Comment[]>>({})
  const [memoryStats, setMemoryStats] = useState<Record<string, { like_count: number, liked_by_him: boolean, liked_by_her: boolean }>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [replyToComments, setReplyToComments] = useState<Record<string, Comment | null>>({})
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({})
  const [showAllMemories, setShowAllMemories] = useState(false)
  const [isExpanding, setIsExpanding] = useState(false)

  // 获取回忆数据
  const { data, error, isLoading } = useSWR<{
    success: boolean
    data: MemoryData
  }>(getApiPath('/memories'), fetcher, {
    revalidateOnFocus: true
  })

  const memories = data?.data?.memories || []
  const hasMemories = memories.length > 0
  
  // 计算要显示的回忆数量
  const INITIAL_DISPLAY_COUNT = 5
  const displayedMemories = showAllMemories ? memories : memories.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMoreMemories = memories.length > INITIAL_DISPLAY_COUNT

  // 展开更多回忆的处理
  const handleExpandMemories = async () => {
    setIsExpanding(true)
    // 添加一个小延迟，让动画更流畅
    setTimeout(() => {
      setShowAllMemories(true)
      setIsExpanding(false)
    }, 300)
  }

  // 处理文件拖拽
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      // 验证文件类型 - 支持更多格式
      if (!file.type.startsWith('image/')) {
        setUploadError('只支持图片文件')
        return
      }
      
      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('图片大小不能超过 10MB')
        return
      }

      setSelectedFile(file)
      setUploadError('')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff']
    },
    multiple: false,
    disabled: isUploading
  })

  // 获取特定回忆的评论
  const fetchCommentsForMemory = async (memoryId: string) => {
    try {
      const response = await fetch(getApiPath(`/memories/comments?memory_id=${memoryId}`))
      if (response.ok) {
        const data = await response.json()
        setMemoryComments(prev => ({
          ...prev,
          [memoryId]: data.data || []
        }))
      }
    } catch (error) {
      console.error('获取评论失败:', error)
    }
  }

  // 切换评论展开状态
  const toggleComments = (memoryId: string) => {
    const isExpanded = expandedComments.has(memoryId)
    if (isExpanded) {
      setExpandedComments(prev => {
        const newSet = new Set(prev)
        newSet.delete(memoryId)
        return newSet
      })
    } else {
      setExpandedComments(prev => new Set(prev.add(memoryId)))
      // 如果还没有加载评论，就加载
      if (!memoryComments[memoryId]) {
        fetchCommentsForMemory(memoryId)
      }
    }
  }

  // 处理点赞
  const handleLike = async (memoryId: string) => {
    if (!user) return
    
    try {
      const response = await fetch(getApiPath('/memories/likes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memory_id: memoryId,
          user_id: user.id
        })
      })

      if (response.ok) {
        // 重新获取该回忆的点赞信息
        const likeResponse = await fetch(getApiPath(`/memories/likes?memory_id=${memoryId}`))
        if (likeResponse.ok) {
          const likeData = await likeResponse.json()
          setMemoryStats(prev => ({
            ...prev,
            [memoryId]: {
              like_count: likeData.data.like_count,
              liked_by_him: likeData.data.liked_by_him,
              liked_by_her: likeData.data.liked_by_her
            }
          }))
        }
        // 刷新回忆列表
        mutate(getApiPath('/memories'))
      }
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  // 处理上传
  const handleUpload = async () => {
    if (!selectedFile || !description.trim()) return

    setIsUploading(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('description', description.trim())

      const response = await fetch(getApiPath('/memories/upload'), {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        // 刷新数据
        await mutate(getApiPath('/memories'))
        // 重置状态
        setSelectedFile(null)
        setDescription('')
        setShowUploader(false)
      } else {
        setUploadError(result.error || '上传失败')
      }
    } catch (error) {
      setUploadError('上传过程中出现问题')
    } finally {
      setIsUploading(false)
    }
  }

  // 重置上传器
  const resetUploader = () => {
    setSelectedFile(null)
    setDescription('')
    setUploadError('')
    setShowUploader(false)
  }

  // 处理评论提交
  const handleSubmitComment = async (memoryId: string) => {
    const comment = newComments[memoryId]
    if (!comment?.trim() || !user) return

    setIsSubmittingComment(prev => ({ ...prev, [memoryId]: true }))
    try {
      const response = await fetch(getApiPath('/memories/comments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memory_id: memoryId,
          user_id: user.id,
          content: comment.trim(),
          parent_comment_id: replyToComments[memoryId]?.id || null
        })
      })

      if (response.ok) {
        const result = await response.json()
        setNewComments(prev => ({ ...prev, [memoryId]: '' }))
        setReplyToComments(prev => ({ ...prev, [memoryId]: null }))
        
        // 刷新该回忆的评论
        await fetchCommentsForMemory(memoryId)
        
        // 更新评论数量
        if (result.data?.comment_count) {
          setCommentCounts(prev => ({ ...prev, [memoryId]: result.data.comment_count }))
        }
        
        // 刷新回忆列表（更新评论数）
        mutate(getApiPath('/memories'))
      }
    } catch (error) {
      console.error('提交评论失败:', error)
    } finally {
      setIsSubmittingComment(prev => ({ ...prev, [memoryId]: false }))
    }
  }

  // 开始回复评论
  const handleReplyToComment = (memoryId: string, comment: Comment) => {
    setReplyToComments(prev => ({ ...prev, [memoryId]: comment }))
    const userName = comment.user_id === 'him' 
      ? process.env.NEXT_PUBLIC_USER_HIM_NAME || '他'
      : process.env.NEXT_PUBLIC_USER_HER_NAME || '她'
    setNewComments(prev => ({ 
      ...prev, 
      [memoryId]: `@${userName}: ` 
    }))
  }

  // 取消回复
  const cancelReply = (memoryId: string) => {
    setReplyToComments(prev => ({ ...prev, [memoryId]: null }))
    setNewComments(prev => ({ ...prev, [memoryId]: '' }))
  }

  // 渲染评论列表
  const renderComments = (memoryId: string, comments: Comment[], level = 0) => {
    return comments
      .filter(comment => 
        level === 0 
          ? !comment.parent_comment_id 
          : comment.parent_comment_id === comments[0]?.id
      )
      .map(comment => {
        const userName = comment.user_id === 'him' 
          ? process.env.NEXT_PUBLIC_USER_HIM_NAME || '他'
          : process.env.NEXT_PUBLIC_USER_HER_NAME || '她'
          
        return (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${level > 0 ? 'ml-6 mt-2' : 'mb-3'} p-3 bg-amber-50/50 rounded-lg border border-amber-100/50`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-amber-800">
                    {userName}
                  </span>
                  <span className="text-xs text-amber-600">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-amber-900 text-sm leading-relaxed">{comment.content}</p>
              </div>
              <button
                onClick={() => handleReplyToComment(memoryId, comment)}
                className="ml-2 p-1 text-amber-600 hover:text-amber-800 transition-colors opacity-60 hover:opacity-100"
              >
                <Reply className="w-3 h-3" />
              </button>
            </div>
            
            {/* 递归渲染回复 */}
            {comments.filter(c => c.parent_comment_id === comment.id).length > 0 && (
              <div className="mt-2">
                {renderComments(memoryId, comments.filter(c => c.parent_comment_id === comment.id), level + 1)}
              </div>
            )}
          </motion.div>
        )
      })
  }

  // 如果正在加载
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-warm-paper rounded-2xl p-6 shadow-lg border border-warm-muted"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-serif text-warm-text">时光相册</h3>
          <Camera className="w-6 h-6 text-primary-500" />
        </div>
        
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-warm-text/70">加载我们的回忆...</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-warm-paper rounded-2xl p-6 shadow-lg border border-warm-muted"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-serif text-warm-text">时光相册</h3>
        <div className="flex items-center space-x-2">
          {hasMemories && (
            <span className="text-sm text-warm-text/60">
              共 {memories.length} 个美好瞬间
            </span>
          )}
          <Camera className="w-6 h-6 text-primary-500" />
        </div>
      </div>

      {/* 添加回忆按钮 */}
      <div className="mb-6">
        <motion.button
          onClick={() => setShowUploader(true)}
          data-upload-trigger
          className="group relative flex items-center space-x-3 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-medium py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 w-full justify-center"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ rotate: [0, 15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Plus className="w-5 h-5" />
            </motion.div>
            <span>分享美好瞬间</span>
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              ✨
            </motion.div>
          </div>
          
          {/* 可爱的背景装饰 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-300/20 to-rose-300/20 blur-lg group-hover:blur-xl transition-all duration-300" />
        </motion.button>
      </div>

      {/* 回忆展示 - 信息流卡片形式 */}
      {hasMemories ? (
        <div className="space-y-6">
          {/* 信息流卡片列表 */}
          <div className="space-y-8">
            {displayedMemories.map((memory, index) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                {/* 头部信息 */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {memory.uploader_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-warm-text">{memory.uploader_name}</p>
                      <p className="text-sm text-warm-text/60">
                        {formatRelativeTime(new Date(memory.created_at))}
                      </p>
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    className="text-pink-400"
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                </div>

                {/* 图片 */}
                <div className="relative">
                  <img
                    src={memory.image_url}
                    alt={memory.description}
                    className="w-full h-auto object-cover cursor-pointer transition-transform duration-300 group-hover:scale-[1.02]"
                    onClick={() => setSelectedMemory(memory)}
                    loading="lazy"
                  />
                  {/* 渐变遮罩 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* 内容和互动区域 */}
                <div className="p-4 space-y-3">
                  {/* 描述文字 */}
                  <p className="text-warm-text leading-relaxed">
                    {memory.description}
                  </p>

                  {/* 互动按钮 */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleLike(memory.id)}
                        className={`flex items-center space-x-1 transition-colors ${
                          ((user?.id === 'him' && (memoryStats[memory.id]?.liked_by_him || memory.liked_by_him)) ||
                           (user?.id === 'her' && (memoryStats[memory.id]?.liked_by_her || memory.liked_by_her)))
                            ? 'text-red-500'
                            : 'text-warm-text/60 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${
                          ((user?.id === 'him' && (memoryStats[memory.id]?.liked_by_him || memory.liked_by_him)) ||
                           (user?.id === 'her' && (memoryStats[memory.id]?.liked_by_her || memory.liked_by_her)))
                            ? 'fill-current' : ''
                        }`} />
                        <span className="text-sm font-medium">
                          {memoryStats[memory.id]?.like_count || memory.like_count || 0}
                        </span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleComments(memory.id)}
                        className="flex items-center space-x-1 text-warm-text/60 hover:text-blue-500 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {commentCounts[memory.id] || memory.comment_count || 0}
                        </span>
                      </motion.button>
                    </div>

                    {/* 可爱的小装饰 */}
                    <div className="flex space-x-1">
                      {['💕', '✨', '🌸'].map((emoji, i) => (
                        <motion.span
                          key={i}
                          className="text-sm opacity-60"
                          animate={{
                            y: [0, -2, 0],
                          }}
                          transition={{
                            duration: 2,
                            delay: i * 0.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          {emoji}
                        </motion.span>
                      ))}
                    </div>
                  </div>

                  {/* 内联评论区 */}
                  <AnimatePresence>
                    {expandedComments.has(memory.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-amber-200 pt-4 mt-4"
                      >
                        {/* 评论列表 */}
                        <div className="space-y-3 mb-4">
                          {memoryComments[memory.id]?.length > 0 ? (
                            renderComments(memory.id, memoryComments[memory.id])
                          ) : (
                            <div className="text-center py-4 text-amber-600 text-sm">
                              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-amber-300" />
                              还没有评论，来留下第一个评论吧！
                            </div>
                          )}
                        </div>

                        {/* 回复提示 */}
                        {replyToComments[memory.id] && (
                          <div className="mb-3 p-2 bg-amber-50 rounded border border-amber-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-amber-600">
                                回复 {replyToComments[memory.id]!.user_id === 'him' 
                                  ? process.env.NEXT_PUBLIC_USER_HIM_NAME || '他'
                                  : process.env.NEXT_PUBLIC_USER_HER_NAME || '她'}
                              </span>
                              <button
                                onClick={() => cancelReply(memory.id)}
                                className="text-amber-600 hover:text-amber-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-sm text-amber-800 truncate">
                              {replyToComments[memory.id]!.content}
                            </p>
                          </div>
                        )}

                        {/* 评论输入框 */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newComments[memory.id] || ''}
                            onChange={(e) => setNewComments(prev => ({ ...prev, [memory.id]: e.target.value }))}
                            placeholder={replyToComments[memory.id] ? "输入回复..." : "输入评论..."}
                            className="flex-1 px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSubmitComment(memory.id)
                              }
                            }}
                          />
                          <button
                            onClick={() => handleSubmitComment(memory.id)}
                            disabled={!newComments[memory.id]?.trim() || isSubmittingComment[memory.id]}
                            className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                          >
                            {isSubmittingComment[memory.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 展开更多按钮 */}
          {!showAllMemories && hasMoreMemories && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mt-8"
            >
              <motion.button
                onClick={handleExpandMemories}
                disabled={isExpanding}
                className="group flex items-center space-x-3 bg-white hover:bg-amber-50 text-amber-700 font-medium py-3 px-6 rounded-full border-2 border-amber-200 hover:border-amber-300 transition-all duration-300 shadow-md hover:shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isExpanding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>加载中...</span>
                  </>
                ) : (
                  <>
                    <span>查看更多回忆 ({memories.length - INITIAL_DISPLAY_COUNT})</span>
                    <motion.div
                      animate={{ y: [0, 2, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-amber-500"
                    >
                      ↓
                    </motion.div>
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* 收起按钮 */}
          {showAllMemories && hasMoreMemories && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mt-8"
            >
              <motion.button
                onClick={() => {
                  setShowAllMemories(false)
                  // 滚动到顶部
                  const element = document.querySelector('#memory-gallery')
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                className="group flex items-center space-x-3 bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium py-3 px-6 rounded-full border-2 border-amber-300 hover:border-amber-400 transition-all duration-300 shadow-md hover:shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>收起回忆</span>
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-amber-600"
                >
                  ↑
                </motion.div>
              </motion.button>
            </motion.div>
          )}
        </div>
      ) : (
        /* 空状态 */
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-warm-muted/50 rounded-full mb-4">
            <Camera className="w-8 h-8 text-warm-text/50" />
          </div>
          <h4 className="text-lg font-serif text-warm-text mb-2">还没有共同的回忆呢</h4>
          <p className="text-warm-text/70 mb-6">开始记录属于你们的美好瞬间吧</p>
        </div>
      )}

      {/* 上传面板 */}
      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && resetUploader()}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-warm-paper rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="text-pink-400"
                  >
                    <Sparkles className="w-6 h-6" />
                  </motion.div>
                  <h4 className="text-lg font-serif text-warm-text">分享美好瞬间</h4>
                </div>
                <button
                  onClick={resetUploader}
                  className="text-warm-text/70 hover:text-warm-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 文件选择区域 */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-pink-400 bg-pink-50 scale-105'
                    : 'border-warm-muted hover:border-pink-300 hover:bg-pink-50/50'
                }`}
              >
                <input {...getInputProps()} />
                
                {selectedFile ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-full max-h-48 object-cover rounded-xl shadow-sm"
                    />
                    <div className="flex items-center justify-center space-x-2 text-warm-text">
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-green-500">✓</span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <motion.div
                      animate={{ 
                        y: [0, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="flex justify-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                    </motion.div>
                    <div>
                      <p className="text-warm-text font-medium">
                        {isDragActive ? '放下图片，创造回忆 ✨' : '拖拽照片到这里，或点击选择'}
                      </p>
                      <p className="text-sm text-warm-text/60 mt-1">
                        支持 JPG、PNG、GIF、WebP 等格式，最大 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 描述输入 */}
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-warm-text mb-3 flex items-center space-x-2">
                      <span>关于这一刻，我想说...</span>
                      <motion.span
                        animate={{ 
                          rotate: [0, 20, -20, 0]
                        }}
                        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                      >
                        💭
                      </motion.span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="记录这个美好的瞬间... 比如当时的心情、想法或者发生的有趣事情 💕"
                      className="w-full p-4 border-2 border-warm-muted rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 resize-none transition-all duration-200 placeholder-warm-text/40"
                      rows={4}
                      maxLength={300}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-warm-text/50">
                        {description.length}/300
                      </div>
                      <div className="flex space-x-1">
                        {['🌸', '💕', '✨'].map((emoji, i) => (
                          <motion.button
                            key={i}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setDescription(prev => prev + emoji)}
                            className="w-6 h-6 text-sm hover:bg-pink-100 rounded-full transition-colors"
                          >
                            {emoji}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 错误提示 */}
                  {uploadError && (
                    <div className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg">
                      {uploadError}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex space-x-3">
                    <motion.button
                      onClick={resetUploader}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 px-4 bg-gray-100 text-warm-text rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    >
                      取消
                    </motion.button>
                    <motion.button
                      onClick={handleUpload}
                      disabled={!description.trim() || isUploading}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
                    >
                      {isUploading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>上传中...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <span>分享到相册</span>
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                          >
                            💕
                          </motion.span>
                        </div>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 查看大图模态框 */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setSelectedMemory(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] flex flex-col"
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => setSelectedMemory(null)}
                className="absolute -top-12 right-0 text-white hover:text-white/80 transition-colors z-10"
              >
                <X className="w-8 h-8" />
              </button>

              {/* 图片 */}
              <img
                src={selectedMemory.image_url}
                alt={selectedMemory.description}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />

              {/* 信息 */}
              <div className="bg-warm-paper rounded-lg p-4 mt-4">
                <p className="text-warm-text mb-2">{selectedMemory.description}</p>
                <div className="flex items-center justify-between text-sm text-warm-text/70">
                  <span>来自 {selectedMemory.uploader_name}</span>
                  <span>{formatRelativeTime(new Date(selectedMemory.created_at))}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}