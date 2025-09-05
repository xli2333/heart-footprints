// Supabase 数据库类型定义
export interface Database {
  public: {
    Tables: {
      // 每日定位记录
      daily_locations: {
        Row: {
          id: string
          user_id: 'him' | 'her'
          latitude: number
          longitude: number
          mood_emoji?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: 'him' | 'her'
          latitude: number
          longitude: number
          mood_emoji?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: 'him' | 'her'
          latitude?: number
          longitude?: number
          mood_emoji?: string
          created_at?: string
        }
      }
      
      // 时光相册记录
      memories: {
        Row: {
          id: string
          user_id: 'him' | 'her'
          image_url: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: 'him' | 'her'
          image_url: string
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: 'him' | 'her'
          image_url?: string
          description?: string
          created_at?: string
        }
      }
      
      // 倒数日事件
      countdown_events: {
        Row: {
          id: string
          title: string
          target_date: string
          background_image_url?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          target_date: string
          background_image_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          target_date?: string
          background_image_url?: string
          updated_at?: string
        }
      }
      
      // 时光信札
      letters: {
        Row: {
          id: string
          sender_id: 'him' | 'her'
          title?: string
          content: string
          reply_to?: string
          scheduled_delivery_at?: string
          delivered_at?: string
          read_at?: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: 'him' | 'her'
          title?: string
          content: string
          reply_to?: string
          scheduled_delivery_at?: string
          delivered_at?: string
          read_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: 'him' | 'her'
          title?: string
          content?: string
          reply_to?: string
          scheduled_delivery_at?: string
          delivered_at?: string
          read_at?: string
        }
      }
      
      // 点赞记录
      likes: {
        Row: {
          id: string
          memory_id: string
          user_id: 'him' | 'her'
          created_at: string
        }
        Insert: {
          id?: string
          memory_id: string
          user_id: 'him' | 'her'
          created_at?: string
        }
        Update: {
          id?: string
          memory_id?: string
          user_id?: 'him' | 'her'
        }
      }
      
      // 评论记录
      comments: {
        Row: {
          id: string
          memory_id: string
          user_id: 'him' | 'her'
          content: string
          parent_comment_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          memory_id: string
          user_id: 'him' | 'her'
          content: string
          parent_comment_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          memory_id?: string
          user_id?: 'him' | 'her'
          content?: string
          parent_comment_id?: string
          updated_at?: string
        }
      }
    }
  }
}

// 用户类型
export type UserType = 'him' | 'her'

// 用户信息接口
export interface User {
  id: UserType
  name: string
}

// 每日定位接口
export interface DailyLocation {
  id: string
  user_id: UserType
  latitude: number
  longitude: number
  mood_emoji?: string
  created_at: string
}

// 记忆接口
export interface Memory {
  id: string
  user_id: UserType
  image_url: string
  description: string
  created_at: string
}

// 扩展的记忆接口（包含点赞和评论统计）
export interface MemoryWithStats extends Memory {
  like_count: number
  comment_count: number
  liked_by_him: boolean
  liked_by_her: boolean
}

// 点赞接口
export interface Like {
  id: string
  memory_id: string
  user_id: UserType
  created_at: string
}

// 评论接口
export interface Comment {
  id: string
  memory_id: string
  user_id: UserType
  content: string
  parent_comment_id?: string
  created_at: string
  updated_at: string
  level?: number
  replies?: Comment[]
}

// 倒数日事件接口
export interface CountdownEvent {
  id: string
  title: string
  target_date: string
  background_image_url?: string
  created_at: string
  updated_at: string
}

// 信件接口
export interface Letter {
  id: string
  sender_id: UserType
  title?: string
  content: string
  reply_to?: string
  scheduled_delivery_at?: string
  delivered_at?: string
  read_at?: string
  created_at: string
}

// 信件线程接口
export interface LetterThread {
  id: string
  sender_id: UserType
  title?: string
  content: string
  reply_to?: string
  created_at: string
  delivered_at?: string
  read_at?: string
  scheduled_delivery_at?: string
  thread_level: number
  is_delivered: boolean
  is_read: boolean
}

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}