import { NextRequest, NextResponse } from 'next/server'
import { mockApi } from '@/lib/mock-data'
// 强制动态渲染
export const dynamic = 'force-dynamic'


// 获取信件列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'inbox' | 'sent' | 'all' || 'all'

    const result = await mockApi.getLetters(type)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Get letters error:', error)
    return NextResponse.json(
      { success: false, error: '获取信件时出现问题' },
      { status: 500 }
    )
  }
}

// 发送信件
export async function POST(request: NextRequest) {
  try {
    const { title, content, scheduled_delivery_at } = await request.json()

    // 验证内容
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '信件内容不能为空' },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: '信件内容不能超过 2000 个字符' },
        { status: 400 }
      )
    }

    if (title && title.length > 100) {
      return NextResponse.json(
        { success: false, error: '标题不能超过 100 个字符' },
        { status: 400 }
      )
    }

    // 处理定时发送
    if (scheduled_delivery_at) {
      const scheduledDate = new Date(scheduled_delivery_at)
      const now = new Date()

      if (scheduledDate <= now) {
        return NextResponse.json(
          { success: false, error: '定时发送时间必须是未来的时间' },
          { status: 400 }
        )
      }
    }

    const result = await mockApi.sendLetter(title, content.trim(), scheduled_delivery_at)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Send letter error:', error)
    return NextResponse.json(
      { success: false, error: '发送信件时出现问题' },
      { status: 500 }
    )
  }
}