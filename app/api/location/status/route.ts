import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { calculateDistance } from '@/lib/utils'

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

    // 获取今天的日期
    const today = new Date().toISOString().split('T')[0]

    // 获取今天两人的位置记录
    const { data: locations, error } = await supabase
      .from('daily_locations')
      .select('*')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '获取位置状态失败' },
        { status: 500 }
      )
    }

    // 解析位置数据
    const himLocation = locations?.find(l => l.user_id === 'him')
    const herLocation = locations?.find(l => l.user_id === 'her')
    
    const himSynced = !!himLocation
    const herSynced = !!herLocation
    const bothSynced = himSynced && herSynced
    const currentUserSynced = user.id === 'him' ? himSynced : herSynced

    let distance = null
    let distanceMessage = ''

    if (bothSynced) {
      distance = calculateDistance(
        himLocation!.latitude,
        himLocation!.longitude,
        herLocation!.latitude,
        herLocation!.longitude
      )
      distanceMessage = `今天，我们相距 ${Math.round(distance)} 公里`
    } else if (currentUserSynced) {
      const otherUserName = user.id === 'him' 
        ? process.env.USER_HER_NAME 
        : process.env.USER_HIM_NAME
      distanceMessage = `等待 ${otherUserName} 的回应...`
    } else {
      distanceMessage = '今天，你在哪儿？'
    }

    return NextResponse.json({
      success: true,
      data: {
        himSynced,
        herSynced,
        bothSynced,
        currentUserSynced,
        distance: distance ? Math.round(distance) : null,
        distanceMessage,
        himLocation: himLocation ? {
          latitude: himLocation.latitude,
          longitude: himLocation.longitude,
          mood_emoji: himLocation.mood_emoji,
          created_at: himLocation.created_at
        } : null,
        herLocation: herLocation ? {
          latitude: herLocation.latitude,
          longitude: herLocation.longitude,
          mood_emoji: herLocation.mood_emoji,
          created_at: herLocation.created_at
        } : null
      }
    })

  } catch (error) {
    console.error('Location status error:', error)
    return NextResponse.json(
      { success: false, error: '获取位置状态时出现问题' },
      { status: 500 }
    )
  }
}