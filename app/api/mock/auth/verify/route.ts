import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

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