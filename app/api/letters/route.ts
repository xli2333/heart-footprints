import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
// 强制动态渲染
export const dynamic = 'force-dynamic'


// 获取信件列表
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
    const type = searchParams.get('type') // 'inbox' | 'sent' | 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('letters')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 根据类型过滤
    if (type === 'inbox') {
      // 收件箱：已送达的来自对方的信件
      const otherUserId = user.id === 'him' ? 'her' : 'him'
      query = query
        .eq('sender_id', otherUserId)
        .not('delivered_at', 'is', null)
    } else if (type === 'sent') {
      // 发件箱：我发送的信件
      query = query.eq('sender_id', user.id)
    } else {
      // 全部：已送达的信件（包括收发）
      query = query.not('delivered_at', 'is', null)
    }

    const { data: letters, error, count } = await supabase
      .from('letters')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '获取信件失败' },
        { status: 500 }
      )
    }

    // 处理定时发送的信件
    await handlePendingLetters()

    // 格式化数据，包含发信人名称
    const formattedLetters = letters?.map(letter => ({
      ...letter,
      sender_name: letter.sender_id === 'him' 
        ? process.env.USER_HIM_NAME 
        : process.env.USER_HER_NAME,
      is_sent_by_current_user: letter.sender_id === user.id,
      is_delivered: !!letter.delivered_at,
      is_read: !!letter.read_at
    })).filter(letter => {
      // 过滤逻辑
      if (type === 'inbox') {
        return !letter.is_sent_by_current_user && letter.is_delivered
      } else if (type === 'sent') {
        return letter.is_sent_by_current_user
      }
      return letter.is_delivered
    }) || []

    // 统计未读信件数量
    const unreadCount = formattedLetters.filter(letter => 
      !letter.is_sent_by_current_user && !letter.is_read
    ).length

    return NextResponse.json({
      success: true,
      data: {
        letters: formattedLetters,
        total: count || 0,
        unreadCount,
        hasMore: formattedLetters.length === limit
      }
    })

  } catch (error) {
    console.error('Get letters error:', error)
    return NextResponse.json(
      { success: false, error: '获取信件时出现问题' },
      { status: 500 }
    )
  }
}

// 发送信件
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

    const { title, content, scheduled_delivery_at, reply_to } = await request.json()

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

    // 如果是回信，验证原信件是否存在
    if (reply_to) {
      const { data: originalLetter, error: letterError } = await supabase
        .from('letters')
        .select('id, sender_id')
        .eq('id', reply_to)
        .single()

      if (letterError || !originalLetter) {
        return NextResponse.json(
          { success: false, error: '原信件不存在' },
          { status: 400 }
        )
      }

      // 确保不是回复自己的信件
      if (originalLetter.sender_id === user.id) {
        return NextResponse.json(
          { success: false, error: '不能回复自己的信件' },
          { status: 400 }
        )
      }
    }

    // 处理定时发送
    let deliveryAt = null
    let scheduledAt = null

    if (scheduled_delivery_at) {
      const scheduledDate = new Date(scheduled_delivery_at)
      const now = new Date()

      if (scheduledDate <= now) {
        return NextResponse.json(
          { success: false, error: '定时发送时间必须是未来的时间' },
          { status: 400 }
        )
      }

      scheduledAt = scheduledDate.toISOString()
    } else {
      // 立即发送
      deliveryAt = new Date().toISOString()
    }

    // 插入信件
    const { data: newLetter, error } = await supabase
      .from('letters')
      .insert({
        sender_id: user.id,
        title: title?.trim() || null,
        content: content.trim(),
        reply_to: reply_to || null,
        scheduled_delivery_at: scheduledAt,
        delivered_at: deliveryAt
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '发送信件失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        letter: newLetter,
        message: scheduledAt ? '信件已安排定时发送' : '信件发送成功'
      }
    })

  } catch (error) {
    console.error('Send letter error:', error)
    return NextResponse.json(
      { success: false, error: '发送信件时出现问题' },
      { status: 500 }
    )
  }
}

// 处理待发送的信件
async function handlePendingLetters() {
  try {
    const now = new Date().toISOString()
    
    // 更新到期的定时信件
    await supabase
      .from('letters')
      .update({ delivered_at: now })
      .is('delivered_at', null)
      .not('scheduled_delivery_at', 'is', null)
      .lte('scheduled_delivery_at', now)
  } catch (error) {
    console.error('Handle pending letters error:', error)
  }
}