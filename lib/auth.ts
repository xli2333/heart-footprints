import jwt from 'jsonwebtoken'
import { User, UserType } from '@/types/database'

// 环境变量验证
const JWT_SECRET = process.env.JWT_SECRET
const USER_HIM_PASSWORD = process.env.USER_HIM_PASSWORD
const USER_HER_PASSWORD = process.env.USER_HER_PASSWORD
const USER_HIM_NAME = process.env.USER_HIM_NAME || 'Him'
const USER_HER_NAME = process.env.USER_HER_NAME || 'Her'

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
if (!USER_HIM_PASSWORD) {
  throw new Error('USER_HIM_PASSWORD environment variable is required')
}
if (!USER_HER_PASSWORD) {
  throw new Error('USER_HER_PASSWORD environment variable is required')
}

// 验证密码并返回用户信息
export function authenticateUser(password: string): User | null {
  if (password === USER_HIM_PASSWORD) {
    return { id: 'him', name: USER_HIM_NAME }
  } else if (password === USER_HER_PASSWORD) {
    return { id: 'her', name: USER_HER_NAME }
  }
  return null
}

// 生成 JWT token
export function generateToken(user: User): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '30d' })
}

// 验证 JWT token
export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User
    return decoded
  } catch (error) {
    return null
  }
}

// 从请求中获取用户信息
export function getUserFromRequest(request: Request): User | null {
  const cookies = request.headers.get('cookie')
  if (!cookies) return null
  
  const tokenCookie = cookies
    .split(';')
    .find(cookie => cookie.trim().startsWith('auth-token='))
  
  if (!tokenCookie) return null
  
  const token = tokenCookie.split('=')[1]
  return verifyToken(token)
}

// 创建认证 cookie
export function createAuthCookie(token: string): string {
  return `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}; Path=/`
}

// 清除认证 cookie
export function clearAuthCookie(): string {
  return 'auth-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
}