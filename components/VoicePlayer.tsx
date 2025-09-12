'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

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

interface VoicePlayerProps {
  message: VoiceMessage
  onDelete?: (messageId: string) => void
  onDownload?: (messageId: string) => void
  onPlay?: () => void
  compact?: boolean
}

export default function VoicePlayer({ 
  message, 
  onDelete, 
  onDownload,
  onPlay,
  compact = false 
}: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(message.duration || 0)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [waveform, setWaveform] = useState<number[]>(new Array(20).fill(0.3))
  const [playedWaveform, setPlayedWaveform] = useState<boolean[]>(new Array(20).fill(false))
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<number>(0)

  // 格式化时间
  const formatTime = (seconds: number) => {
    // 处理无效值
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '0:00'
    }
    
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  // 生成随机波形（实际项目中应该从音频文件分析获得）
  useEffect(() => {
    const generateWaveform = () => {
      const newWaveform = Array.from({ length: 20 }, () => 0.2 + Math.random() * 0.6)
      setWaveform(newWaveform)
    }
    generateWaveform()
  }, [message.id])

  // 更新播放进度
  useEffect(() => {
    const updateProgress = () => {
      if (audioRef.current && isPlaying) {
        const current = audioRef.current.currentTime
        const total = audioRef.current.duration || duration
        
        setCurrentTime(current)
        setDuration(total)
        
        progressRef.current = current / total
        
        // 更新波形显示
        const playedBars = Math.floor(progressRef.current * 20)
        const newPlayedWaveform = waveform.map((_, index) => index < playedBars)
        setPlayedWaveform(newPlayedWaveform)
      }
    }

    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(updateProgress, 100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, duration, waveform])

  const togglePlay = async () => {
    if (!audioRef.current) return

    try {
      setIsLoading(true)
      
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        // 检查音频是否已加载
        if (audioRef.current.readyState < 2) {
          // 等待音频加载
          await new Promise((resolve, reject) => {
            const handleLoaded = () => {
              audioRef.current?.removeEventListener('canplay', handleLoaded)
              audioRef.current?.removeEventListener('error', handleError)
              resolve(true)
            }
            const handleError = (e: Event) => {
              audioRef.current?.removeEventListener('canplay', handleLoaded)
              audioRef.current?.removeEventListener('error', handleError)
              reject(e)
            }
            audioRef.current?.addEventListener('canplay', handleLoaded)
            audioRef.current?.addEventListener('error', handleError)
            audioRef.current?.load()
          })
        }
        
        await audioRef.current.play()
        setIsPlaying(true)
        
        // 调用onPlay回调（用于标记为已读）
        onPlay?.()
      }
    } catch (error) {
      console.error('播放错误:', error)
      
      // 对于blob URL，提供更详细的错误处理
      if (message.audioUrl.startsWith('blob:')) {
        console.log('本地音频播放失败，blob URL可能已过期')
        // 在生产环境中，可以尝试重新获取音频
        alert('音频已过期，请重新录制')
      } else if (message.audioUrl.includes('supabase')) {
        // Supabase存储的音频
        console.log('Supabase音频播放失败')
        alert('音频加载失败，请检查网络连接')
      } else {
        alert('音频播放失败，请稍后重试')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resetAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      setCurrentTime(0)
      setPlayedWaveform(new Array(20).fill(false))
      progressRef.current = 0
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleWaveformClick = (index: number) => {
    if (audioRef.current) {
      const targetTime = (index / 20) * duration
      audioRef.current.currentTime = targetTime
      setCurrentTime(targetTime)
      
      const newPlayedWaveform = waveform.map((_, i) => i < index)
      setPlayedWaveform(newPlayedWaveform)
      progressRef.current = targetTime / duration
    }
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-warm-paper rounded-xl p-4 shadow-sm border border-warm-muted/50"
      >
        {/* 消息头部信息 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-medium text-warm-text text-sm">
                {message.senderName}
              </div>
              <div className="text-xs text-warm-text/60">
                {formatDistanceToNow(new Date(message.timestamp), { 
                  addSuffix: true, 
                  locale: zhCN 
                })}
              </div>
            </div>
          </div>
          
          {/* 时长显示 */}
          <div className="text-sm text-warm-text/70 font-mono">
            {formatTime(duration)}
          </div>
        </div>

        {/* 播放器控件 */}
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="flex items-center justify-center w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors shadow-sm flex-shrink-0"
          >
            {isLoading ? (
              <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          
          {/* 波形和进度 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1 mb-2">
              {waveform.map((height, index) => (
                <button
                  key={index}
                  onClick={() => handleWaveformClick(index)}
                  className="flex-1 h-5 flex items-end cursor-pointer group"
                >
                  <div
                    className={`w-full rounded-sm transition-colors ${
                      playedWaveform[index]
                        ? 'bg-primary-500'
                        : 'bg-warm-muted group-hover:bg-primary-300'
                    }`}
                    style={{ height: `${height * 16 + 3}px` }}
                  />
                </button>
              ))}
            </div>
            
            {/* 当前时间显示 */}
            <div className="text-center text-xs text-warm-text/60 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={message.audioUrl}
          muted={isMuted}
          onEnded={() => {
            setIsPlaying(false)
            resetAudio()
          }}
          onLoadedMetadata={() => {
            if (audioRef.current && isFinite(audioRef.current.duration)) {
              setDuration(audioRef.current.duration)
            }
          }}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-warm-paper rounded-2xl p-4 shadow-lg border border-warm-muted"
    >
      {/* 消息头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <Volume2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-serif text-warm-text">{message.senderName}</div>
            <div className="text-xs text-warm-text/60">
              {formatDistanceToNow(new Date(message.timestamp), { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onDownload && (
            <button
              onClick={() => onDownload(message.id)}
              className="text-warm-text/50 hover:text-warm-text transition-colors p-1"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="text-warm-text/50 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 波形和控制 */}
      <div className="space-y-4">
        {/* 波形显示 */}
        <div className="flex items-end space-x-1 h-12 bg-warm-bg rounded-lg p-2">
          {waveform.map((height, index) => (
            <button
              key={index}
              onClick={() => handleWaveformClick(index)}
              className="flex-1 h-full flex items-end cursor-pointer group"
            >
              <div
                className={`w-full rounded-sm transition-all duration-200 ${
                  playedWaveform[index]
                    ? 'bg-primary-500 shadow-sm'
                    : 'bg-warm-muted group-hover:bg-primary-300'
                }`}
                style={{ height: `${height * 32 + 6}px` }}
              />
            </button>
          ))}
        </div>

        {/* 时间显示 */}
        <div className="flex items-center justify-between text-sm text-warm-text/70">
          <span className="font-mono">{formatTime(currentTime)}</span>
          <div className="flex-1 mx-4 h-1 bg-warm-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-200"
              style={{ width: `${progressRef.current * 100}%` }}
            />
          </div>
          <span className="font-mono">{formatTime(duration)}</span>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={resetAudio}
            className="flex items-center justify-center w-10 h-10 bg-warm-bg hover:bg-warm-muted text-warm-text rounded-full transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="flex items-center justify-center w-12 h-12 bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors shadow-lg"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>
          
          <button
            onClick={toggleMute}
            className="flex items-center justify-center w-10 h-10 bg-warm-bg hover:bg-warm-muted text-warm-text rounded-full transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 隐藏的音频元素 */}
      <audio
        ref={audioRef}
        src={message.audioUrl}
        muted={isMuted}
        onEnded={() => {
          setIsPlaying(false)
          resetAudio()
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration)
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </motion.div>
  )
}