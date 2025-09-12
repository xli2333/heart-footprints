import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/types/database'
// 强制动态渲染
export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    const { memory_id, user_id } = await request.json()
    
    if (!memory_id || !user_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 })
    }

    // 调用数据库函数切换点赞状态
    const { data, error } = await supabase
      .rpc('toggle_like', {
        p_memory_id: memory_id,
        p_user_id: user_id
      })

    if (error) {
      console.error('点赞操作失败:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '点赞操作失败'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data
    })
  } catch (error) {
    console.error('点赞API错误:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memory_id = searchParams.get('memory_id')
    
    if (!memory_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '缺少memory_id参数'
      }, { status: 400 })
    }

    // 获取该回忆的点赞信息
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('memory_id', memory_id)

    if (error) {
      console.error('获取点赞信息失败:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '获取点赞信息失败'
      }, { status: 500 })
    }

    const likeInfo = {
      like_count: data.length,
      liked_by_him: data.some(like => like.user_id === 'him'),
      liked_by_her: data.some(like => like.user_id === 'her'),
      likes: data
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: likeInfo
    })
  } catch (error) {
    console.error('获取点赞API错误:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}