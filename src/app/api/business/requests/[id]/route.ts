import { NextRequest, NextResponse } from 'next/server'
import { BusinessRequestStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { canModerate } from '@/lib/publication'
import { businessRequestStatusSchema, parseBody } from '@/lib/schemas'

/**
 * Смена статуса запроса.
 * Автор открывает, переводит в работу и закрывает свой запрос.
 * Модератор может скрыть любой запрос и вернуть его.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(request)
    if (response) return response

    const { id } = await params
    const existing = await prisma.businessRequest.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, title: true },
    })
    if (!existing) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

    const moderator = canModerate(user)
    const author = existing.authorId === user.id
    if (!moderator && !author) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(businessRequestStatusSchema, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const status = parsed.data.status as BusinessRequestStatus

    // Скрывать и возвращать скрытое может только модератор
    if (!moderator && (status === BusinessRequestStatus.HIDDEN || existing.status === BusinessRequestStatus.HIDDEN)) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const updated = await prisma.businessRequest.update({
      where: { id },
      data: {
        status,
        moderationNote: status === BusinessRequestStatus.HIDDEN ? parsed.data.moderationNote : null,
      },
      select: { id: true, status: true },
    })

    await audit(user, 'UPDATE', 'business_request', id, `${existing.title}: ${existing.status} → ${status}`)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Business request update error:', error)
    return NextResponse.json({ error: 'Не удалось обновить задачу' }, { status: 500 })
  }
}
