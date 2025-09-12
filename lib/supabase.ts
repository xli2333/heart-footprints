import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// 在构建时提供默认值，避免构建失败
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// 运行时检查环境变量
if (typeof window !== 'undefined') {
  if (supabaseUrl === 'https://placeholder.supabase.co') {
    console.error('❌ 错误: Supabase URL 未配置，请在环境变量中设置 NEXT_PUBLIC_SUPABASE_URL')
    throw new Error('Supabase configuration missing: NEXT_PUBLIC_SUPABASE_URL is required')
  }
  
  if (supabaseAnonKey === 'placeholder-anon-key') {
    console.error('❌ 错误: Supabase Anon Key 未配置，请在环境变量中设置 NEXT_PUBLIC_SUPABASE_ANON_KEY')  
    throw new Error('Supabase configuration missing: NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }
}

export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})

// 创建 Supabase 客户端的通用函数
export function createClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)
}