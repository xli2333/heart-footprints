import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'
// 强制动态渲染
export const dynamic = 'force-dynamic'


export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '已安全退出'
  })
  
  response.headers.set('Set-Cookie', clearAuthCookie())
  
  return response
}