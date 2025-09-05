import { NextResponse } from 'next/server'
import { mockApi } from '@/lib/mock-data'

export async function GET() {
  try {
    const result = await mockApi.getMemories()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Get memories error:', error)
    return NextResponse.json(
      { success: false, error: '获取回忆时出现问题' },
      { status: 500 }
    )
  }
}