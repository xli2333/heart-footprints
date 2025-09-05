import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, generateToken, createAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    if (!password) {
      return NextResponse.json(
        { success: false, error: '请输入我们的暗号' },
        { status: 400 }
      )
    }

    const user = authenticateUser(password)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '暗号不对哦，再想想？' },
        { status: 401 }
      )
    }

    const token = generateToken(user)
    const cookie = createAuthCookie(token)
    
    const response = NextResponse.json({
      success: true,
      data: { user }
    })
    
    response.headers.set('Set-Cookie', cookie)
    
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: '登录时出现了问题，请稍后再试' },
      { status: 500 }
    )
  }
}