import { NextRequest, NextResponse } from 'next/server'
import { mockApi } from '@/lib/mock-data'

// GET - 获取语音消息列表
export async function GET() {
  try {
    const result = await mockApi.getVoiceMessages()
    return NextResponse.json(result)
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
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const duration = parseFloat(formData.get('duration') as string)
    const sender = formData.get('sender') as 'him' | 'her'

    if (!audioFile || !duration || !sender) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      )
    }

    // 将File转换为Blob
    const arrayBuffer = await audioFile.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: audioFile.type })

    const result = await mockApi.sendVoiceMessage(blob, duration, sender)
    return NextResponse.json(result)
  } catch (error) {
    console.error('发送语音消息失败:', error)
    return NextResponse.json(
      { success: false, error: '发送语音消息失败' },
      { status: 500 }
    )
  }
}