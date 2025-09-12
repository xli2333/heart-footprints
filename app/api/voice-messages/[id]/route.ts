import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// DELETE - 删除语音消息
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const messageId = params.id
    
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: '消息ID不能为空' },
        { status: 400 }
      )
    }

    // 先获取消息信息，以便删除对应的音频文件
    const { data: messageData, error: fetchError } = await supabase
      .from('voice_messages')
      .select('audio_url')
      .eq('id', messageId)
      .single()

    if (fetchError) {
      console.error('获取消息信息失败:', fetchError)
      return NextResponse.json(
        { success: false, error: '消息不存在' },
        { status: 404 }
      )
    }

    // 从数据库删除记录
    const { error: deleteError } = await supabase
      .from('voice_messages')
      .delete()
      .eq('id', messageId)

    if (deleteError) {
      console.error('删除消息失败:', deleteError)
      return NextResponse.json(
        { success: false, error: '删除消息失败' },
        { status: 500 }
      )
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
    return NextResponse.json(
      { success: false, error: '删除语音消息失败' },
      { status: 500 }
    )
  }
}

// PATCH - 标记消息为已读
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const messageId = params.id
    
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: '消息ID不能为空' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('voice_messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .select()
      .single()

    if (error) {
      console.error('标记消息失败:', error)
      return NextResponse.json(
        { success: false, error: '标记消息失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { message: data }
    })
  } catch (error) {
    console.error('标记消息失败:', error)
    return NextResponse.json(
      { success: false, error: '标记消息失败' },
      { status: 500 }
    )
  }
}