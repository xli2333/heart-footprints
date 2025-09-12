import { NextRequest, NextResponse } from 'next/server'
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

    const result = await mockApi.deleteVoiceMessage(messageId)
    return NextResponse.json(result)
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
    const messageId = params.id
    
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: '消息ID不能为空' },
        { status: 400 }
      )
    }

    const result = await mockApi.markVoiceMessageAsRead(messageId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('标记消息失败:', error)
    return NextResponse.json(
      { success: false, error: '标记消息失败' },
      { status: 500 }
    )
  }
}