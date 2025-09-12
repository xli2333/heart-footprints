import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET - 获取语音消息列表
export async function GET() {
  try {
    const supabase = createClient()
    
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
      senderName: msg.sender_id === 'him' ? '小明' : '小红',
      recipient: msg.recipient_id,
      recipientName: msg.recipient_id === 'him' ? '小明' : '小红',
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
    const supabase = createClient()
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
      return NextResponse.json(
        { success: false, error: '语音文件上传失败' },
        { status: 500 }
      )
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
      // 如果数据库保存失败，删除已上传的文件
      await supabase.storage.from('voice-messages').remove([fileName])
      return NextResponse.json(
        { success: false, error: '消息保存失败' },
        { status: 500 }
      )
    }

    // 格式化返回数据
    const formattedMessage = {
      id: messageData.id,
      sender: messageData.sender_id,
      senderName: messageData.sender_id === 'him' ? '小明' : '小红',
      recipient: messageData.recipient_id,
      recipientName: messageData.recipient_id === 'him' ? '小明' : '小红',
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
    return NextResponse.json(
      { success: false, error: '发送语音消息失败' },
      { status: 500 }
    )
  }
}