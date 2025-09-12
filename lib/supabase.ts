import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// 在构建时提供默认值，避免构建失败
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// 检查是否配置了真实的Supabase
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-anon-key'
}

// 运行时警告但不抛出错误，允许使用Mock API
if (typeof window !== 'undefined') {
  if (supabaseUrl === 'https://placeholder.supabase.co') {
    console.warn('⚠️ 警告: Supabase URL 未配置，将使用Mock API模式')
  }
  
  if (supabaseAnonKey === 'placeholder-anon-key') {
    console.warn('⚠️ 警告: Supabase Anon Key 未配置，将使用Mock API模式')
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
  // 如果配置不正确，直接返回null，让API层处理fallback
  if (!isSupabaseConfigured()) {
    return null
  }
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)
}