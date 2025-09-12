import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
// 强制动态渲染
export const dynamic = 'force-dynamic'


// 获取倒数日事件列表
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

    // 获取所有有效的倒数日事件（包括未来和过期的）
    const { data: events, error } = await supabase
      .from('countdown_events')
      .select('*')
      .order('target_date', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '获取倒数日失败' },
        { status: 500 }
      )
    }

    // 分离有效和过期的事件
    const now = new Date()
    const activeEvents = events?.filter(event => new Date(event.target_date) > now) || []
    const expiredEvents = events?.filter(event => new Date(event.target_date) <= now) || []

    return NextResponse.json({
      success: true,
      data: {
        activeEvents,
        expiredEvents,
        totalEvents: events?.length || 0,
        hasActiveEvents: activeEvents.length > 0
      }
    })

  } catch (error) {
    console.error('Get countdown error:', error)
    return NextResponse.json(
      { success: false, error: '获取倒数日时出现问题' },
      { status: 500 }
    )
  }
}

// 创建新的倒数日事件
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

    const { title, target_date, background_image_url } = await request.json()

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

    // 检查是否已有5个以上的有效事件（限制数量）
    const { data: existingEvents, error: countError } = await supabase
      .from('countdown_events')
      .select('id')
      .gt('target_date', now.toISOString())

    if (countError) {
      console.error('Count error:', countError)
    } else if (existingEvents && existingEvents.length >= 5) {
      return NextResponse.json(
        { success: false, error: '最多只能设置5个未来的倒数日事件' },
        { status: 400 }
      )
    }

    // 创建新的倒数日事件
    const { data: newEvent, error } = await supabase
      .from('countdown_events')
      .insert({
        title: title.trim(),
        target_date: targetDate.toISOString(),
        background_image_url: background_image_url || null
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '创建倒数日失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        event: newEvent,
        message: '倒数日已设置成功'
      }
    })

  } catch (error) {
    console.error('Create countdown error:', error)
    return NextResponse.json(
      { success: false, error: '创建倒数日时出现问题' },
      { status: 500 }
    )
  }
}

// 删除倒数日事件
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 删除所有倒数日事件
    const { error } = await supabase
      .from('countdown_events')
      .delete()
      .neq('id', 'dummy') // 删除所有记录

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '删除倒数日失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '倒数日已删除'
    })

  } catch (error) {
    console.error('Delete countdown error:', error)
    return NextResponse.json(
      { success: false, error: '删除倒数日时出现问题' },
      { status: 500 }
    )
  }
}