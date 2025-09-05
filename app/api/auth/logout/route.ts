import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '已安全退出'
  })
  
  response.headers.set('Set-Cookie', clearAuthCookie())
  
  return response
}