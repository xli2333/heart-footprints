import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
// 强制动态渲染
export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  
  if (!user) {
    return NextResponse.json(
      { success: false, error: '未认证' },
      { status: 401 }
    )
  }
  
  return NextResponse.json({
    success: true,
    data: { user }
  })
}