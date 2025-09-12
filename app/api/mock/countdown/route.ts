import { NextRequest, NextResponse } from 'next/server'
import { mockApi } from '@/lib/mock-data'
// 强制动态渲染
export const dynamic = 'force-dynamic'


// 获取当前倒数日事件
export async function GET() {
  try {
    const result = await mockApi.getCountdown()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Get countdown error:', error)
    return NextResponse.json(
      { success: false, error: '获取倒数日时出现问题' },
      { status: 500 }
    )
  }
}

// 创建新的倒数日事件
export async function POST(request: NextRequest) {
  try {
    const { title, target_date } = await request.json()

    // 验证数据
    if (!title || !target_date) {
      return NextResponse.json(
        { success: false, error: '标题和目标日期都不能为空' },
        { status: 400 }
      )
    }

    if (title.length > 50) {
      return NextResponse.json(
        { success: false, error: '标题不能超过 50 个字符' },
        { status: 400 }
      )
    }

    // 验证目标日期是否在未来
    const targetDate = new Date(target_date)
    const now = new Date()
    
    if (targetDate <= now) {
      return NextResponse.json(
        { success: false, error: '目标日期必须是未来的时间' },
        { status: 400 }
      )
    }

    const result = await mockApi.createCountdown(title.trim(), target_date)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Create countdown error:', error)
    return NextResponse.json(
      { success: false, error: '创建倒数日时出现问题' },
      { status: 500 }
    )
  }
}

// 删除倒数日事件
export async function DELETE() {
  try {
    const result = await mockApi.deleteCountdown()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Delete countdown error:', error)
    return NextResponse.json(
      { success: false, error: '删除倒数日时出现问题' },
      { status: 500 }
    )
  }
}