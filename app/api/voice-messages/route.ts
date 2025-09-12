import { NextRequest, NextResponse } from 'next/server'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import { mockApi } from '@/lib/mock-data'

// GET - 获取语音消息列表
export async function GET() {
  try {
    const supabase = createClient()
    const isConfigured = isSupabaseConfigured()
    
    console.log('🔍 获取语音消息 - Supabase配置检查:')
    console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 已配置' : '❌ 未配置')
    console.log('- SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 已配置' : '❌ 未配置')
    console.log('- isSupabaseConfigured():', isConfigured)
    console.log('- supabase客户端:', supabase ? '✅ 创建成功' : '❌ 创建失败')
    
    // 如果Supabase未配置或客户端为null，使用Mock API
    if (!supabase || !isConfigured) {
      console.log('🔄 使用Mock API获取语音消息，原因:', !supabase ? 'supabase客户端为null' : 'Supabase未正确配置')
      return NextResponse.json(await mockApi.getVoiceMessages())
    }
    
    console.log('🚀 使用Supabase获取语音消息')
    
    const { data, error } = await supabase
      .from('voice_messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取语音消息失败:', error)
      // 如果Supabase出错，fallback到Mock API
      console.log('🔄 Supabase出错，fallback到Mock API')
      return NextResponse.json(await mockApi.getVoiceMessages())
    }

    // 转换数据格式以匹配前端接口
    const formattedData = data?.map(msg => ({
      id: msg.id,
      sender: msg.sender_id,
      senderName: msg.sender_id === 'him' ? process.env.USER_HIM_NAME || '老公' : process.env.USER_HER_NAME || '宝贝',
      recipient: msg.recipient_id,
      recipientName: msg.recipient_id === 'him' ? process.env.USER_HIM_NAME || '老公' : process.env.USER_HER_NAME || '宝贝',
      audioUrl: msg.audio_url,
      duration: msg.duration,
      timestamp: msg.created_at,
      isNew: !msg.is_read
    })) || []

    return NextResponse.json({
      success: true,
      data: formattedData
    })
  } catch (error) {
    console.error('获取语音消息失败:', error)
    // 发生任何错误都fallback到Mock API
    console.log('🔄 发生错误，fallback到Mock API')
    return NextResponse.json(await mockApi.getVoiceMessages())
  }
}

// POST - 发送语音消息
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const duration = parseFloat(formData.get('duration') as string)
    const sender = formData.get('sender') as 'him' | 'her'
    const recipient = formData.get('recipient') as 'him' | 'her'

    if (!audioFile || !duration || !sender || !recipient) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      )
    }

    // 强制尝试连接Supabase，不管配置检测结果
    console.log('🔍 语音消息POST - 强制尝试Supabase连接')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('- 环境变量检查:')
    console.log('  SUPABASE_URL存在:', !!supabaseUrl)
    console.log('  SUPABASE_URL值:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : '未设置')
    console.log('  SUPABASE_KEY存在:', !!supabaseKey)
    console.log('  SUPABASE_KEY值:', supabaseKey ? supabaseKey.substring(0, 10) + '...' : '未设置')
    
    // 如果有真实的Supabase配置，强制使用
    if (supabaseUrl && supabaseKey && 
        supabaseUrl !== 'https://placeholder.supabase.co' && 
        supabaseKey !== 'placeholder-anon-key') {
      
      console.log('🚀 检测到真实Supabase配置，强制使用Supabase上传')
      
      // 直接创建Supabase客户端，不依赖工具函数
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      // 生成唯一文件名
      const timestamp = Date.now()
      const fileName = `voice-${sender}-${timestamp}.webm`
      
      console.log('📁 准备上传文件:', fileName)
      
      try {
        // 上传文件到 Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('voice-messages')
          .upload(fileName, audioFile, {
            contentType: 'audio/webm',
            upsert: false
          })

        if (uploadError) {
          console.error('❌ Supabase文件上传失败:', uploadError)
          throw uploadError
        }

        console.log('✅ 文件上传成功:', uploadData)

        // 获取公共访问URL
        const { data: urlData } = supabase.storage
          .from('voice-messages')
          .getPublicUrl(fileName)

        console.log('🔗 获取公共URL:', urlData.publicUrl)

        // 保存消息记录到数据库
        const { data: messageData, error: dbError } = await supabase
          .from('voice_messages')
          .insert([{
            sender_id: sender,
            recipient_id: recipient,
            audio_url: urlData.publicUrl,
            duration: duration,
            is_read: false
          }])
          .select()
          .single()

        if (dbError) {
          console.error('❌ 数据库保存失败:', dbError)
          // 删除已上传的文件
          await supabase.storage.from('voice-messages').remove([fileName])
          throw dbError
        }

        console.log('✅ 消息保存成功:', messageData)

        // 格式化返回数据
        const formattedMessage = {
          id: messageData.id,
          sender: messageData.sender_id,
          senderName: messageData.sender_id === 'him' ? process.env.USER_HIM_NAME || '老公' : process.env.USER_HER_NAME || '宝贝',
          recipient: messageData.recipient_id,
          recipientName: messageData.recipient_id === 'him' ? process.env.USER_HIM_NAME || '老公' : process.env.USER_HER_NAME || '宝贝',
          audioUrl: messageData.audio_url,
          duration: messageData.duration,
          timestamp: messageData.created_at,
          isNew: !messageData.is_read
        }

        return NextResponse.json({
          success: true,
          data: formattedMessage,
          message: '语音消息发送成功'
        })

      } catch (supabaseError) {
        console.error('🔄 Supabase操作失败，fallback到Mock API:', supabaseError)
        // Fallback到Mock API
      }
    } else {
      console.log('🔄 未检测到有效的Supabase配置，使用Mock API')
    }
    
    // Fallback: 使用Mock API
    console.log('🔄 使用Mock API发送语音消息')
    const arrayBuffer = await audioFile.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: audioFile.type })
    return NextResponse.json(await mockApi.sendVoiceMessage(blob, duration, sender))
  } catch (error) {
    console.error('发送语音消息失败:', error)
    // 发生任何错误都fallback到Mock API
    console.log('🔄 发生错误，fallback到Mock API')
    try {
      const formData = await request.formData()
      const audioFile = formData.get('audio') as File
      const duration = parseFloat(formData.get('duration') as string)
      const sender = formData.get('sender') as 'him' | 'her'
      
      const arrayBuffer = await audioFile.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: audioFile.type })
      return NextResponse.json(await mockApi.sendVoiceMessage(blob, duration, sender))
    } catch (fallbackError) {
      return NextResponse.json(
        { success: false, error: '发送语音消息失败' },
        { status: 500 }
      )
    }
  }
}