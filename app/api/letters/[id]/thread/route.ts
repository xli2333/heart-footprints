import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// 获取信件对话线程
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

    const letterId = params.id

    if (!letterId) {
      return NextResponse.json(
        { success: false, error: '信件ID不能为空' },
        { status: 400 }
      )
    }

    // 使用数据库函数获取完整的对话线程
    const { data: threadData, error } = await supabase
      .rpc('get_letter_thread', { 
        letter_id: letterId,
        include_future: false 
      })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '获取对话线程失败' },
        { status: 500 }
      )
    }

    // 格式化数据
    const formattedThread = threadData?.map((letter: any) => ({
      ...letter,
      sender_name: letter.sender_id === 'him' 
        ? process.env.USER_HIM_NAME 
        : process.env.USER_HER_NAME,
      is_sent_by_current_user: letter.sender_id === user.id,
      receiver_name: letter.sender_id === 'him'
        ? process.env.USER_HER_NAME
        : process.env.USER_HIM_NAME
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        thread: formattedThread,
        totalMessages: formattedThread.length
      }
    })

  } catch (error) {
    console.error('Get letter thread error:', error)
    return NextResponse.json(
      { success: false, error: '获取对话线程时出现问题' },
      { status: 500 }
    )
  }
}