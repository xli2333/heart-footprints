import { NextRequest, NextResponse } from 'next/server'
import { mockApi } from '@/lib/mock-data'
// 强制动态渲染
export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string

    // 验证文件
    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择一张图片' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: '只支持图片文件' },
        { status: 400 }
      )
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '图片大小不能超过 5MB' },
        { status: 400 }
      )
    }

    // 验证描述
    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '请添加关于这一刻的描述' },
        { status: 400 }
      )
    }

    if (description.length > 200) {
      return NextResponse.json(
        { success: false, error: '描述不能超过 200 个字符' },
        { status: 400 }
      )
    }

    const result = await mockApi.uploadMemory(file, description.trim())
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mock Memory upload error:', error)
    return NextResponse.json(
      { success: false, error: '上传过程中出现问题' },
      { status: 500 }
    )
  }
}