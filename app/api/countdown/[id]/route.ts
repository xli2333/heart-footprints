import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
// 强制动态渲染
export const dynamic = 'force-dynamic'


// 获取单个倒数日事件
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const eventId = params.id

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: '事件ID不能为空' },
        { status: 400 }
      )
    }

    const { data: event, error } = await supabase
      .from('countdown_events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '获取倒数日事件失败' },
        { status: 500 }
      )
    }

    if (!event) {
      return NextResponse.json(
        { success: false, error: '倒数日事件不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { event }
    })

  } catch (error) {
    console.error('Get countdown event error:', error)
    return NextResponse.json(
      { success: false, error: '获取倒数日事件时出现问题' },
      { status: 500 }
    )
  }
}

// 删除特定的倒数日事件
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const eventId = params.id

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: '事件ID不能为空' },
        { status: 400 }
      )
    }

    // 删除指定的倒数日事件
    const { error } = await supabase
      .from('countdown_events')
      .delete()
      .eq('id', eventId)

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

// 更新特定的倒数日事件
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const eventId = params.id
    const { title, target_date, background_image_url } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: '事件ID不能为空' },
        { status: 400 }
      )
    }

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

    // 更新倒数日事件
    const { data: updatedEvent, error } = await supabase
      .from('countdown_events')
      .update({
        title: title.trim(),
        target_date: targetDate.toISOString(),
        background_image_url: background_image_url || null
      })
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '更新倒数日失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        event: updatedEvent,
        message: '倒数日已更新成功'
      }
    })

  } catch (error) {
    console.error('Update countdown error:', error)
    return NextResponse.json(
      { success: false, error: '更新倒数日时出现问题' },
      { status: 500 }
    )
  }
}