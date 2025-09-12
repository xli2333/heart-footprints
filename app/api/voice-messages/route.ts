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

    const supabase = createClient()
    const isConfigured = isSupabaseConfigured()
    
    // 详细的调试日志
    console.log('🔍 Supabase配置检查:')
    console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 已配置' : '❌ 未配置')
    console.log('- SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 已配置' : '❌ 未配置')
    console.log('- isSupabaseConfigured():', isConfigured)
    console.log('- supabase客户端:', supabase ? '✅ 创建成功' : '❌ 创建失败')
    
    // 如果Supabase未配置或客户端为null，使用Mock API
    if (!supabase || !isConfigured) {
      console.log('🔄 使用Mock API发送语音消息，原因:', !supabase ? 'supabase客户端为null' : 'Supabase未正确配置')
      const arrayBuffer = await audioFile.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: audioFile.type })
      return NextResponse.json(await mockApi.sendVoiceMessage(blob, duration, sender))
    }
    
    console.log('🚀 使用Supabase上传语音消息')

    // 生成唯一文件名
    const timestamp = Date.now()
    const fileName = `voice-${sender}-${timestamp}.webm`
    
    // 上传文件到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, audioFile, {
        contentType: 'audio/webm',
        upsert: false
      })

    if (uploadError) {
      console.error('文件上传失败:', uploadError)
      // 如果上传失败，fallback到Mock API
      console.log('🔄 文件上传失败，fallback到Mock API')
      const arrayBuffer = await audioFile.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: audioFile.type })
      return NextResponse.json(await mockApi.sendVoiceMessage(blob, duration, sender))
    }

    // 获取公共访问URL
    const { data: urlData } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(fileName)

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
      console.error('消息保存失败:', dbError)
      // 如果数据库保存失败，删除已上传的文件并fallback到Mock API
      await supabase.storage.from('voice-messages').remove([fileName])
      console.log('🔄 消息保存失败，fallback到Mock API')
      const arrayBuffer = await audioFile.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: audioFile.type })
      return NextResponse.json(await mockApi.sendVoiceMessage(blob, duration, sender))
    }

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