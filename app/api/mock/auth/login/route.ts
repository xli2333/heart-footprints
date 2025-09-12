import { NextRequest, NextResponse } from 'next/server'
import { mockApi } from '@/lib/mock-data'
import { generateToken, createAuthCookie } from '@/lib/auth'
// 强制动态渲染
export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    if (!password) {
      return NextResponse.json(
        { success: false, error: '请输入我们的暗号' },
        { status: 400 }
      )
    }

    const result = await mockApi.login(password)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 401 })
    }

    // 生成JWT token并设置cookie
    const token = generateToken(result.data.user)
    const cookie = createAuthCookie(token)
    
    const response = NextResponse.json(result)
    response.headers.set('Set-Cookie', cookie)
    
    return response
  } catch (error) {
    console.error('Mock Login error:', error)
    return NextResponse.json(
      { success: false, error: '登录时出现了问题，请稍后再试' },
      { status: 500 }
    )
  }
}