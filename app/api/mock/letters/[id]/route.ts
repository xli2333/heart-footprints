import { NextRequest, NextResponse } from 'next/server'
import { mockApi } from '@/lib/mock-data'
// 强制动态渲染
export const dynamic = 'force-dynamic'


// 标记信件为已读
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const letterId = params.id
    const result = await mockApi.markLetterAsRead(letterId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Mark letter as read error:', error)
    return NextResponse.json(
      { success: false, error: '标记已读时出现问题' },
      { status: 500 }
    )
  }
}

// 删除信件
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const letterId = params.id
    const result = await mockApi.deleteLetter(letterId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Delete letter error:', error)
    return NextResponse.json(
      { success: false, error: '删除信件时出现问题' },
      { status: 500 }
    )
  }
}