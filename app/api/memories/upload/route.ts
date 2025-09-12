import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
// 强制动态渲染
export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

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

    // 验证文件类型 - 支持更多格式
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      'image/tiff',
      'image/tif'
    ]
    
    if (!file.type.startsWith('image/') || !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '支持的图片格式：JPG、PNG、GIF、WebP、BMP、SVG、TIFF' },
        { status: 400 }
      )
    }

    // 验证文件大小 (10MB) - 增加支持更大的文件
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '图片大小不能超过 10MB' },
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

    if (description.length > 300) {
      return NextResponse.json(
        { success: false, error: '描述不能超过 300 个字符' },
        { status: 400 }
      )
    }

    // 生成文件名
    const fileExtension = file.name.split('.').pop()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${user.id}-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`

    // 上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memories')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: '图片上传失败' },
        { status: 500 }
      )
    }

    // 获取公共 URL
    const { data: urlData } = supabase.storage
      .from('memories')
      .getPublicUrl(fileName)

    if (!urlData.publicUrl) {
      return NextResponse.json(
        { success: false, error: '获取图片链接失败' },
        { status: 500 }
      )
    }

    // 保存到数据库
    const { data: memoryData, error: dbError } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        description: description.trim()
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // 如果数据库保存失败，删除已上传的文件
      await supabase.storage.from('memories').remove([fileName])
      return NextResponse.json(
        { success: false, error: '保存记忆失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        memory: memoryData,
        message: '成功添加到我们的时光相册'
      }
    })

  } catch (error) {
    console.error('Memory upload error:', error)
    return NextResponse.json(
      { success: false, error: '上传过程中出现问题' },
      { status: 500 }
    )
  }
}