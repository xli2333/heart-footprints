import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
// 强制动态渲染
export const dynamic = 'force-dynamic'


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

    // 简化的方法：直接查询相关信件
    // 首先获取当前信件
    const { data: currentLetter, error: currentError } = await supabase
      .from('letters')
      .select('*')
      .eq('id', letterId)
      .single()

    if (currentError || !currentLetter) {
      return NextResponse.json(
        { success: false, error: '信件不存在' },
        { status: 404 }
      )
    }

    // 找到根信件（第一封信）
    let rootLetter = currentLetter
    if (currentLetter.reply_to) {
      const { data: parentLetter } = await supabase
        .from('letters')
        .select('*')
        .eq('id', currentLetter.reply_to)
        .single()
      
      if (parentLetter) {
        // 继续向上查找直到找到根信件
        let tempLetter = parentLetter
        while (tempLetter.reply_to) {
          const { data: nextParent } = await supabase
            .from('letters')
            .select('*')
            .eq('id', tempLetter.reply_to)
            .single()
          
          if (nextParent) {
            tempLetter = nextParent
          } else {
            break
          }
        }
        rootLetter = tempLetter
      }
    }

    // 获取整个对话线程 - 使用递归方法
    let allThreadLetters = [rootLetter]
    
    // 递归获取所有回复
    const getReplyLetters = async (parentId: string): Promise<any[]> => {
      const { data: replies } = await supabase
        .from('letters')
        .select('*')
        .eq('reply_to', parentId)
        .not('delivered_at', 'is', null)
        .order('created_at', { ascending: true })
      
      let allReplies = replies || []
      
      // 为每个回复继续查找其回复
      for (const reply of replies || []) {
        const subReplies = await getReplyLetters(reply.id)
        allReplies = allReplies.concat(subReplies)
      }
      
      return allReplies
    }
    
    // 获取所有回复
    const allReplies = await getReplyLetters(rootLetter.id)
    allThreadLetters = allThreadLetters.concat(allReplies)
    
    // 按创建时间排序
    allThreadLetters.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    
    const threadData = allThreadLetters

    // 格式化数据并添加线程级别
    const formattedThread = threadData?.map((letter: any, index: number) => ({
      ...letter,
      sender_name: letter.sender_id === 'him' 
        ? (process.env.USER_HIM_NAME || '对方')
        : (process.env.USER_HER_NAME || '我'),
      is_sent_by_current_user: letter.sender_id === user.id,
      receiver_name: letter.sender_id === 'him'
        ? (process.env.USER_HER_NAME || '我')
        : (process.env.USER_HIM_NAME || '对方'),
      thread_level: letter.reply_to ? 1 : 0,
      is_delivered: !!letter.delivered_at,
      is_read: !!letter.read_at
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