import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/types/database'
// 强制动态渲染
export const dynamic = 'force-dynamic'


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

    // 获取该回忆的所有评论（使用comment_tree视图）
    const { data, error } = await supabase
      .from('comment_tree')
      .select('*')
      .eq('memory_id', memory_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('获取评论失败:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '获取评论失败'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data
    })
  } catch (error) {
    console.error('获取评论API错误:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { memory_id, user_id, content, parent_comment_id } = await request.json()
    
    if (!memory_id || !user_id || !content?.trim()) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 })
    }

    // 调用数据库函数添加评论
    const { data, error } = await supabase
      .rpc('add_comment', {
        p_memory_id: memory_id,
        p_user_id: user_id,
        p_content: content.trim(),
        p_parent_comment_id: parent_comment_id || null
      })

    if (error) {
      console.error('添加评论失败:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '添加评论失败'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data
    })
  } catch (error) {
    console.error('添加评论API错误:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { comment_id, content, user_id } = await request.json()
    
    if (!comment_id || !content?.trim() || !user_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 })
    }

    // 更新评论内容
    const { data, error } = await supabase
      .from('comments')
      .update({ 
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', comment_id)
      .eq('user_id', user_id) // 确保只能修改自己的评论
      .select()
      .single()

    if (error) {
      console.error('更新评论失败:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '更新评论失败'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data
    })
  } catch (error) {
    console.error('更新评论API错误:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const comment_id = searchParams.get('comment_id')
    const user_id = searchParams.get('user_id')
    
    if (!comment_id || !user_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 })
    }

    // 删除评论（级联删除回复）
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', comment_id)
      .eq('user_id', user_id) // 确保只能删除自己的评论

    if (error) {
      console.error('删除评论失败:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '删除评论失败'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { deleted: true }
    })
  } catch (error) {
    console.error('删除评论API错误:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}