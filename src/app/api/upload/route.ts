import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireApiRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { BLOB_PREFIX, BLOB_STORE_ID, MAX_UPLOAD_BYTES } from '@/lib/uploads'

// PDF складываются в Vercel Blob. Раньше файлы писались в public/uploads,
// но на Vercel файловая система доступна только на чтение — запись падала
// с EROFS, и загрузка не работала.
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

    if (file.size > MAX_UPLOAD_BYTES) {
      const limitMb = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)
      return NextResponse.json({ error: `Файл больше ${limitMb}MB` }, { status: 400 })
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

    // Sanitize filename: strip path separators, keep only safe chars, cap length
    const ext = '.pdf'
    const baseName = file.name
      .replace(/\.[^.]+$/, '') // drop original extension, we force .pdf
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 60)
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const filename = `${uniqueId}-${baseName || 'document'}${ext}`

    await put(`${BLOB_PREFIX}/${filename}`, buffer, {
      access: 'private',
      contentType: 'application/pdf',
      addRandomSuffix: false,
      storeId: BLOB_STORE_ID,
    })

    // Наружу отдаём не ссылку Blob, а собственный адрес: файл приватный,
    // и открыть его можно только через /uploads, где проверяется сессия.
    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 })
  }
}
