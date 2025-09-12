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
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 获取所有回忆，包含点赞数和评论数
    const { data: memories, error, count } = await supabase
      .from('memory_stats')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: '获取回忆失败' },
        { status: 500 }
      )
    }

    // 格式化数据，包含上传者名称
    const formattedMemories = memories?.map(memory => ({
      ...memory,
      uploader_name: memory.user_id === 'him' 
        ? process.env.USER_HIM_NAME 
        : process.env.USER_HER_NAME,
      created_at: memory.created_at
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        memories: formattedMemories,
        total: count || 0,
        hasMore: formattedMemories.length === limit,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Get memories error:', error)
    return NextResponse.json(
      { success: false, error: '获取回忆时出现问题' },
      { status: 500 }
    )
  }
}