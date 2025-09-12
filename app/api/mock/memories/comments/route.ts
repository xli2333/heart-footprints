import { NextRequest, NextResponse } from 'next/server'
// 强制动态渲染
export const dynamic = 'force-dynamic'


let mockComments: { [memoryId: string]: Array<{ 
  id: string, 
  memory_id: string,
  user_id: string, 
  content: string, 
  parent_comment_id?: string, 
  created_at: string,
  updated_at: string,
  level?: number 
}> } = {}

// 存储评论数量统计
let commentCounts: { [memoryId: string]: number } = {}

// 生成随机ID
function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

// 更新评论数量
function updateCommentCount(memoryId: string) {
  const comments = mockComments[memoryId] || []
  commentCounts[memoryId] = comments.length
  return commentCounts[memoryId]
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
    await new Promise(resolve => setTimeout(resolve, 300))

    // 如果没有评论，生成一些模拟评论
    if (!mockComments[memory_id]) {
      const sampleComments = [
        {
          id: generateId(),
          memory_id,
          user_id: 'her',
          content: '这张照片真的很美！',
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          id: generateId(),
          memory_id,
          user_id: 'him',
          content: '是的，当时的光线特别好',
          parent_comment_id: undefined, // 会在下面设置
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
        }
      ]
      
      // 设置回复关系
      if (sampleComments.length > 1) {
        sampleComments[1].parent_comment_id = sampleComments[0].id
      }
      
      mockComments[memory_id] = Math.random() > 0.3 ? sampleComments : []
      updateCommentCount(memory_id)
    }

    const comments = mockComments[memory_id] || []

    return NextResponse.json({
      success: true,
      data: comments
    })
  } catch (error) {
    console.error('Mock get comments API error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { memory_id, user_id, content, parent_comment_id } = await request.json()
    
    if (!memory_id || !user_id || !content?.trim()) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 })
    }

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    // 初始化评论数组
    if (!mockComments[memory_id]) {
      mockComments[memory_id] = []
    }

    // 创建新评论
    const newComment = {
      id: generateId(),
      memory_id,
      user_id,
      content: content.trim(),
      parent_comment_id: parent_comment_id || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 添加到评论列表
    mockComments[memory_id].push(newComment)
    
    // 更新评论数量
    const newCount = updateCommentCount(memory_id)

    return NextResponse.json({
      success: true,
      data: {
        comment: newComment,
        comment_count: newCount
      }
    })
  } catch (error) {
    console.error('Mock add comment API error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { comment_id, content, user_id } = await request.json()
    
    if (!comment_id || !content?.trim() || !user_id) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 })
    }

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 400))

    // 查找并更新评论
    let updatedComment = null
    for (const memoryId in mockComments) {
      const comments = mockComments[memoryId]
      const commentIndex = comments.findIndex(c => c.id === comment_id && c.user_id === user_id)
      if (commentIndex !== -1) {
        comments[commentIndex].content = content.trim()
        comments[commentIndex].updated_at = new Date().toISOString()
        updatedComment = comments[commentIndex]
        break
      }
    }

    if (!updatedComment) {
      return NextResponse.json({
        success: false,
        error: '评论不存在或无权限'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: updatedComment
    })
  } catch (error) {
    console.error('Mock update comment API error:', error)
    return NextResponse.json({
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
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 })
    }

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 300))

    // 查找并删除评论
    let deleted = false
    for (const memoryId in mockComments) {
      const comments = mockComments[memoryId]
      const commentIndex = comments.findIndex(c => c.id === comment_id && c.user_id === user_id)
      if (commentIndex !== -1) {
        // 同时删除所有回复
        const toDelete = [comment_id]
        const findReplies = (parentId: string) => {
          comments.forEach(c => {
            if (c.parent_comment_id === parentId) {
              toDelete.push(c.id)
              findReplies(c.id)
            }
          })
        }
        findReplies(comment_id)
        
        // 删除评论和回复
        mockComments[memoryId] = comments.filter(c => !toDelete.includes(c.id))
        deleted = true
        break
      }
    }

    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: '评论不存在或无权限'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })
  } catch (error) {
    console.error('Mock delete comment API error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}