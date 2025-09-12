import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
// 强制动态渲染
export const dynamic = 'force-dynamic'


// 标记信件为已读
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

    const letterId = params.id

    // 验证信件存在且是发给当前用户的
    const { data: letter, error: fetchError } = await supabase
      .from('letters')
      .select('*')
      .eq('id', letterId)
      .single()

    if (fetchError || !letter) {
      return NextResponse.json(
        { success: false, error: '信件不存在' },
        { status: 404 }
      )
    }

    // 检查是否是发给当前用户的信件
    const otherUserId = user.id === 'him' ? 'her' : 'him'
    if (letter.sender_id !== otherUserId) {
      return NextResponse.json(
        { success: false, error: '无权限访问此信件' },
        { status: 403 }
      )
    }

    // 检查信件是否已送达
    if (!letter.delivered_at) {
      return NextResponse.json(
        { success: false, error: '信件尚未送达' },
        { status: 400 }
      )
    }

    // 标记为已读
    const { data: updatedLetter, error } = await supabase
      .from('letters')
      .update({ read_at: new Date().toISOString() })
      .eq('id', letterId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '标记已读失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        letter: {
          ...updatedLetter,
          sender_name: updatedLetter.sender_id === 'him' 
            ? process.env.USER_HIM_NAME 
            : process.env.USER_HER_NAME
        }
      }
    })

  } catch (error) {
    console.error('Mark letter as read error:', error)
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
    // 验证用户身份
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const letterId = params.id

    // 验证信件存在且是当前用户发送的
    const { data: letter, error: fetchError } = await supabase
      .from('letters')
      .select('*')
      .eq('id', letterId)
      .single()

    if (fetchError || !letter) {
      return NextResponse.json(
        { success: false, error: '信件不存在' },
        { status: 404 }
      )
    }

    // 只能删除自己发送的信件
    if (letter.sender_id !== user.id) {
      return NextResponse.json(
        { success: false, error: '只能删除自己发送的信件' },
        { status: 403 }
      )
    }

    // 删除信件
    const { error } = await supabase
      .from('letters')
      .delete()
      .eq('id', letterId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '删除信件失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '信件已删除'
    })

  } catch (error) {
    console.error('Delete letter error:', error)
    return NextResponse.json(
      { success: false, error: '删除信件时出现问题' },
      { status: 500 }
    )
  }
}