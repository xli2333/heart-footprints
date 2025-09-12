import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { calculateDistance } from '@/lib/utils'
// 强制动态渲染
export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
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

    // 获取今天的日期
    const today = new Date().toISOString().split('T')[0]

    // 检查今天是否已经同步过
    const { data: existingLocation } = await supabase
      .from('daily_locations')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .single()

    if (existingLocation) {
      return NextResponse.json(
        { success: false, error: '今天已经同步过位置了哦' },
        { status: 409 }
      )
    }

    // 插入新的位置记录
    const { data: newLocation, error } = await supabase
      .from('daily_locations')
      .insert({
        user_id: user.id,
        latitude,
        longitude,
        mood_emoji: mood_emoji || null
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '保存位置信息失败' },
        { status: 500 }
      )
    }

    // 检查对方今天是否也已经同步
    const otherUserId = user.id === 'him' ? 'her' : 'him'
    const { data: otherLocation } = await supabase
      .from('daily_locations')
      .select('*')
      .eq('user_id', otherUserId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .single()

    let distance = null
    let bothSynced = false

    if (otherLocation) {
      // 计算距离
      distance = calculateDistance(
        latitude,
        longitude,
        otherLocation.latitude,
        otherLocation.longitude
      )
      bothSynced = true
    }

    return NextResponse.json({
      success: true,
      data: {
        location: newLocation,
        bothSynced,
        distance: distance ? Math.round(distance) : null,
        message: bothSynced 
          ? `今天，我们相距 ${Math.round(distance)} 公里` 
          : '位置已同步，等待对方回应...'
      }
    })

  } catch (error) {
    console.error('Location sync error:', error)
    return NextResponse.json(
      { success: false, error: '同步位置时出现问题' },
      { status: 500 }
    )
  }
}