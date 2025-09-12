import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
// 强制动态渲染
export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取 URL 参数
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 使用数据库视图获取距离历史
    const { data: distanceHistory, error } = await supabase
      .from('recent_distances')
      .select('*')
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '获取历史数据失败' },
        { status: 500 }
      )
    }

    // 格式化数据
    const formattedHistory = distanceHistory?.map(record => ({
      date: record.date,
      distance: record.distance_km,
      himLocation: {
        latitude: record.him_lat,
        longitude: record.him_lng,
        mood_emoji: record.him_mood
      },
      herLocation: {
        latitude: record.her_lat,
        longitude: record.her_lng,
        mood_emoji: record.her_mood
      }
    })) || []

    // 计算一些统计信息
    const distances = formattedHistory.map(h => h.distance).filter(Boolean)
    const stats = distances.length > 0 ? {
      averageDistance: Math.round(distances.reduce((a, b) => a + b, 0) / distances.length),
      minDistance: Math.round(Math.min(...distances)),
      maxDistance: Math.round(Math.max(...distances)),
      totalRecords: distances.length
    } : {
      averageDistance: 0,
      minDistance: 0,
      maxDistance: 0,
      totalRecords: 0
    }

    return NextResponse.json({
      success: true,
      data: {
        history: formattedHistory,
        stats,
        hasMore: formattedHistory.length === limit
      }
    })

  } catch (error) {
    console.error('Location history error:', error)
    return NextResponse.json(
      { success: false, error: '获取历史数据时出现问题' },
      { status: 500 }
    )
  }
}