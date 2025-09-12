import { NextRequest, NextResponse } from 'next/server'
import { mockApi } from '@/lib/mock-data'
import { getUserFromRequest } from '@/lib/auth'
// 强制动态渲染
export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    // 获取当前用户信息
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const { latitude, longitude, mood_emoji } = await request.json()

    // 验证经纬度格式
    if (!latitude || !longitude || 
        typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, error: '位置信息格式不正确' },
        { status: 400 }
      )
    }

    const result = await mockApi.syncLocation(user.id, latitude, longitude, mood_emoji)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 409 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Location sync error:', error)
    return NextResponse.json(
      { success: false, error: '同步位置时出现问题' },
      { status: 500 }
    )
  }
}