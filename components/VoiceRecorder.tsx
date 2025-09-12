'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Square, Play, Pause, Send, X } from 'lucide-react'

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void
  onCancel?: () => void
  maxDuration?: number // 最大录制时长（秒）
}

export default function VoiceRecorder({ 
  onSend, 
  onCancel, 
  maxDuration = 60 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [waveform, setWaveform] = useState<number[]>(new Array(20).fill(0))
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // 清理资源
  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
  }

  useEffect(() => {
    return cleanup
  }, [])

  // 更新波形数据
  const updateWaveform = () => {
    if (analyzerRef.current) {
      const bufferLength = analyzerRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyzerRef.current.getByteFrequencyData(dataArray)
      
      // 采样数据生成波形
      const samples = 20
      const sampleSize = Math.floor(bufferLength / samples)
      const newWaveform = []
      
      for (let i = 0; i < samples; i++) {
        const start = i * sampleSize
        const end = start + sampleSize
        const slice = dataArray.slice(start, end)
        const average = slice.reduce((acc, val) => acc + val, 0) / slice.length
        newWaveform.push(Math.min(average / 255, 1))
      }
      
      setWaveform(newWaveform)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })
      
      streamRef.current = stream
      setPermissionDenied(false)

      // 设置音频分析器
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyzer = audioContext.createAnalyser()
      analyzer.fftSize = 256
      source.connect(analyzer)
      
      audioContextRef.current = audioContext
      analyzerRef.current = analyzer

      // 设置录制器
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        cleanup()
      }

      // 开始录制
      mediaRecorder.start(100)
      setIsRecording(true)
      setDuration(0)

      // 更新时长和波形
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 0.1
          if (newDuration >= maxDuration) {
            stopRecording()
            return maxDuration
          }
          return newDuration
        })
        updateWaveform()
      }, 100)

    } catch (error) {
      console.error('Failed to start recording:', error)
      setPermissionDenied(true)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setWaveform(new Array(20).fill(0))
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, duration)
      resetRecorder()
    }
  }

  const resetRecorder = () => {
    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setDuration(0)
    setIsPlaying(false)
    setWaveform(new Array(20).fill(0))
  }

  const handleCancel = () => {
    resetRecorder()
    cleanup()
    onCancel?.()
  }

  if (permissionDenied) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-warm-paper rounded-2xl p-6 shadow-lg border border-warm-muted text-center"
      >
        <MicOff className="w-12 h-12 text-warm-text/50 mx-auto mb-4" />
        <h3 className="text-lg font-serif text-warm-text mb-2">需要麦克风权限</h3>
        <p className="text-sm text-warm-text/70 mb-4">
          请允许浏览器访问您的麦克风以录制语音消息
        </p>
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-warm-bg text-warm-text rounded-lg hover:bg-warm-muted transition-colors"
        >
          取消
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-warm-paper rounded-3xl p-8 shadow-2xl border border-warm-muted w-full max-w-md mx-auto"
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-serif text-warm-text">🎤 录制语音</h3>
        <button
          onClick={handleCancel}
          className="text-warm-text/50 hover:text-warm-text transition-colors p-2"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 波形显示 */}
      <div className="flex items-center justify-center h-24 mb-8 bg-gradient-to-r from-warm-bg/50 to-warm-bg rounded-2xl p-4">
        <div className="flex items-end space-x-2 h-16">
          {waveform.map((height, index) => (
            <motion.div
              key={index}
              className={`rounded-full transition-colors ${
                isRecording 
                  ? 'bg-gradient-to-t from-primary-500 to-primary-400 shadow-sm' 
                  : 'bg-warm-muted'
              }`}
              style={{ width: '4px' }}
              animate={{ 
                height: isRecording ? `${Math.max(height * 60, 6)}px` : '6px'
              }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>
      </div>

      {/* 时长显示 */}
      <div className="text-center mb-8">
        <div className="text-4xl font-mono font-bold text-primary-500 mb-2">
          {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
        </div>
        <div className="text-sm text-warm-text/70">
          最长录制时间 {Math.floor(maxDuration / 60)}:{String(maxDuration % 60).padStart(2, '0')}
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex justify-center space-x-6">
        {!audioBlob ? (
          // 录制状态
          <>
            <motion.button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center justify-center w-16 h-16 rounded-full transition-all shadow-2xl ${
                isRecording 
                  ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white scale-110' 
                  : 'bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white hover:scale-105'
              }`}
              whileTap={{ scale: 0.95 }}
              animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1, repeat: isRecording ? Infinity : 0 }}
            >
              {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </motion.button>
          </>
        ) : (
          // 播放和发送状态
          <>
            <motion.button
              onClick={playAudio}
              className="flex items-center justify-center w-14 h-14 bg-warm-bg hover:bg-warm-muted text-warm-text rounded-full transition-colors shadow-lg"
              whileTap={{ scale: 0.95 }}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </motion.button>
            <motion.button
              onClick={() => {
                resetRecorder()
                startRecording()
              }}
              className="flex items-center justify-center w-14 h-14 bg-warm-bg hover:bg-warm-muted text-warm-text rounded-full transition-colors shadow-lg"
              whileTap={{ scale: 0.95 }}
            >
              <Mic className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={handleSend}
              className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-full transition-all shadow-2xl hover:scale-105"
              whileTap={{ scale: 0.95 }}
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </>
        )}
      </div>

      {/* 操作说明 */}
      <div className="mt-6 text-center">
        <div className="text-sm text-warm-text/70 font-medium">
          {!audioBlob ? (
            isRecording ? '🔴 正在录制中...' : '点击麦克风开始录制'
          ) : (
            '✨ 试听满意后点击发送'
          )}
        </div>
      </div>

      {/* 隐藏的音频元素 */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}
    </motion.div>
  )
}