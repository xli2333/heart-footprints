import { NextRequest, NextResponse } from 'next/server'
import { mockApi } from '@/lib/mock-data'
import { getUserFromRequest } from '@/lib/auth'
// 强制动态渲染
export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
  try {
    // 获取当前用户信息
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const result = await mockApi.getLocationStatus(user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Location status error:', error)
    return NextResponse.json(
      { success: false, error: '获取位置状态时出现问题' },
      { status: 500 }
    )
  }
}