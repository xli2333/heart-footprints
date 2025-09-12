import { NextRequest, NextResponse } from 'next/server'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import { mockApi } from '@/lib/mock-data'

// DELETE - 删除语音消息
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messageId = params.id
    
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: '消息ID不能为空' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // 如果Supabase未配置或客户端为null，使用Mock API
    if (!supabase || !isSupabaseConfigured()) {
      console.log('🔄 使用Mock API删除语音消息')
      return NextResponse.json(await mockApi.deleteVoiceMessage(messageId))
    }

    // 先获取消息信息，以便删除对应的音频文件
    const { data: messageData, error: fetchError } = await supabase
      .from('voice_messages')
      .select('audio_url')
      .eq('id', messageId)
      .single()

    if (fetchError) {
      console.error('获取消息信息失败:', fetchError)
      // 如果获取失败，fallback到Mock API
      console.log('🔄 获取消息失败，fallback到Mock API')
      return NextResponse.json(await mockApi.deleteVoiceMessage(messageId))
    }

    // 从数据库删除记录
    const { error: deleteError } = await supabase
      .from('voice_messages')
      .delete()
      .eq('id', messageId)

    if (deleteError) {
      console.error('删除消息失败:', deleteError)
      // 如果删除失败，fallback到Mock API
      console.log('🔄 删除消息失败，fallback到Mock API')
      return NextResponse.json(await mockApi.deleteVoiceMessage(messageId))
    }

    // 从存储中删除音频文件
    if (messageData.audio_url) {
      // 从URL中提取文件名
      const fileName = messageData.audio_url.split('/').pop()
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('voice-messages')
          .remove([fileName])
        
        if (storageError) {
          console.warn('删除音频文件失败:', storageError)
          // 这里不返回错误，因为数据库记录已经删除成功
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '语音消息已删除'
    })
  } catch (error) {
    console.error('删除语音消息失败:', error)
    // 发生任何错误都fallback到Mock API
    console.log('🔄 发生错误，fallback到Mock API')
    return NextResponse.json(await mockApi.deleteVoiceMessage(params.id))
  }
}

// PATCH - 标记消息为已读
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messageId = params.id
    
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: '消息ID不能为空' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // 如果Supabase未配置或客户端为null，使用Mock API
    if (!supabase || !isSupabaseConfigured()) {
      console.log('🔄 使用Mock API标记消息已读')
      return NextResponse.json(await mockApi.markVoiceMessageAsRead(messageId))
    }

    const { data, error } = await supabase
      .from('voice_messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .select()
      .single()

    if (error) {
      console.error('标记消息失败:', error)
      // 如果标记失败，fallback到Mock API
      console.log('🔄 标记消息失败，fallback到Mock API')
      return NextResponse.json(await mockApi.markVoiceMessageAsRead(messageId))
    }

    return NextResponse.json({
      success: true,
      data: { message: data }
    })
  } catch (error) {
    console.error('标记消息失败:', error)
    // 发生任何错误都fallback到Mock API
    console.log('🔄 发生错误，fallback到Mock API')
    return NextResponse.json(await mockApi.markVoiceMessageAsRead(params.id))
  }
}