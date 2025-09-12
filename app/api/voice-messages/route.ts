import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
// 强制动态渲染
export const dynamic = 'force-dynamic'

// GET - 获取语音消息列表
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }
    
    const { data, error } = await supabase
      .from('voice_messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取语音消息失败:', error)
      return NextResponse.json(
        { success: false, error: '获取语音消息失败' },
        { status: 500 }
      )
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
    return NextResponse.json(
      { success: false, error: '获取语音消息失败' },
      { status: 500 }
    )
  }
}

// POST - 发送语音消息
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const duration = parseFloat(formData.get('duration') as string)
    const sender = formData.get('sender') as 'him' | 'her'
    const recipient = formData.get('recipient') as 'him' | 'her'

    // 验证必要参数
    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: '请选择音频文件' },
        { status: 400 }
      )
    }

    if (!duration || duration <= 0) {
      return NextResponse.json(
        { success: false, error: '音频时长无效' },
        { status: 400 }
      )
    }

    if (!sender || !recipient) {
      return NextResponse.json(
        { success: false, error: '发送者和接收者信息不完整' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { success: false, error: '请上传音频文件' },
        { status: 400 }
      )
    }

    // 验证文件大小 (5MB)
    if (audioFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '音频文件不能超过 5MB' },
        { status: 400 }
      )
    }

    // 生成文件名
    const fileExtension = audioFile.name.split('.').pop() || 'webm'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${user.id}-${sender}-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`

    // 上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, audioFile)

    if (uploadError) {
      console.error('Voice upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: '音频上传失败' },
        { status: 500 }
      )
    }

    // 获取公共 URL
    const { data: urlData } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(fileName)

    if (!urlData.publicUrl) {
      return NextResponse.json(
        { success: false, error: '获取音频链接失败' },
        { status: 500 }
      )
    }

    // 保存到数据库
    const { data: messageData, error: dbError } = await supabase
      .from('voice_messages')
      .insert({
        sender_id: sender,
        recipient_id: recipient,
        audio_url: urlData.publicUrl,
        duration: duration,
        is_read: false
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // 如果数据库保存失败，删除已上传的文件
      await supabase.storage.from('voice-messages').remove([fileName])
      return NextResponse.json(
        { success: false, error: '保存语音消息失败' },
        { status: 500 }
      )
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
    console.error('Voice message error:', error)
    return NextResponse.json(
      { success: false, error: '发送语音消息过程中出现问题' },
      { status: 500 }
    )
  }
}