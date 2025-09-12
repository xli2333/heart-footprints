import { NextRequest, NextResponse } from 'next/server'
// 强制动态渲染
export const dynamic = 'force-dynamic'


let mockLikes: { [memoryId: string]: { [user: string]: boolean } } = {}
let mockComments: { [memoryId: string]: Array<{ id: string, user_id: string, content: string, parent_comment_id?: string, created_at: string }> } = {}

export async function POST(request: NextRequest) {
  try {
    const { memory_id, user_id } = await request.json()
    
    if (!memory_id || !user_id) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 })
    }

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 300))

    // 初始化数据结构
    if (!mockLikes[memory_id]) {
      mockLikes[memory_id] = {}
    }

    // 切换点赞状态
    const currentLiked = mockLikes[memory_id][user_id] || false
    mockLikes[memory_id][user_id] = !currentLiked

    const action = !currentLiked ? 'liked' : 'unliked'

    return NextResponse.json({
      success: true,
      data: {
        action,
        memory_id,
        user_id
      }
    })
  } catch (error) {
    console.error('Mock like API error:', error)
    return NextResponse.json({
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
      return NextResponse.json({
        success: false,
        error: '缺少memory_id参数'
      }, { status: 400 })
    }

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 200))

    const memoryLikes = mockLikes[memory_id] || {}
    const likes = Object.entries(memoryLikes)
      .filter(([, liked]) => liked)
      .map(([user_id]) => ({
        id: `${memory_id}-${user_id}`,
        memory_id,
        user_id,
        created_at: new Date().toISOString()
      }))

    const likeInfo = {
      like_count: likes.length,
      liked_by_him: memoryLikes['him'] || false,
      liked_by_her: memoryLikes['her'] || false,
      likes
    }

    return NextResponse.json({
      success: true,
      data: likeInfo
    })
  } catch (error) {
    console.error('Mock get likes API error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}