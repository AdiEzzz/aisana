import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { requireApiRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'

// Simple local file upload — stores PDFs under public/uploads
// For production with multiple replicas, swap this for S3 / Vercel Blob / etc.
export async function POST(request: NextRequest) {
  try {
    const { response } = await requireApiRole(request, [UserRole.ADMIN, UserRole.EDITOR, UserRole.UNIVERSITY_REP])
    if (response) return response

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Поддерживаются только PDF файлы' }, { status: 400 })
    }

    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Файл больше 20MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Проверка магических байт: file.type — это заголовок из браузера,
    // его легко подделать. Настоящий PDF всегда начинается с "%PDF-".
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return NextResponse.json(
        { error: 'Файл не является PDF (проверка содержимого не пройдена)' },
        { status: 400 }
      )
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    // Sanitize filename: strip path separators, keep only safe chars, cap length
    const ext = '.pdf'
    const baseName = file.name
      .replace(/\.[^.]+$/, '') // drop original extension, we force .pdf
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 60)
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const filename = `${uniqueId}-${baseName || 'document'}${ext}`
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    const url = `/uploads/${filename}`
    return NextResponse.json({ url })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 })
  }
}
