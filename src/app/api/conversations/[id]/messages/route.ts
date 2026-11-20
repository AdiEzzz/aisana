import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { conversationSide } from '@/lib/business'
import { messageSchema, parseBody } from '@/lib/schemas'

async function loadConversation(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    select: { id: true, businessUserId: true, universityId: true },
  })
}

const MESSAGE_SELECT = {
  id: true,
  body: true,
  fromBusiness: true,
  createdAt: true,
  sender: { select: { name: true } },
} as const

/**
 * Сообщения диалога. Параметр after (ISO-время) отдаёт только новые —
 * страница чата опрашивает его раз в несколько секунд.
 * Чтение участником отмечает диалог прочитанным для его стороны.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(request)
    if (response) return response

    const { id } = await params
    const conversation = await loadConversation(id)
    const side = conversation ? conversationSide(user, conversation) : null
    if (!conversation || !side) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

    const afterRaw = request.nextUrl.searchParams.get('after')
    const after = afterRaw ? new Date(afterRaw) : null
    const messages = await prisma.message.findMany({
      where: { conversationId: id, ...(after && !Number.isNaN(after.getTime()) ? { createdAt: { gt: after } } : {}) },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: MESSAGE_SELECT,
    })

    if (side !== 'moderator') {
      await prisma.conversation.update({
        where: { id },
        data: side === 'business' ? { businessReadAt: new Date() } : { universityReadAt: new Date() },
      })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Messages read error:', error)
    return NextResponse.json({ error: 'Не удалось загрузить сообщения' }, { status: 500 })
  }
}

/** Отправка сообщения. Писать могут только стороны диалога, модератор — нет. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(request)
    if (response) return response

    const { id } = await params
    const conversation = await loadConversation(id)
    const side = conversation ? conversationSide(user, conversation) : null
    if (!conversation || !side) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    if (side === 'moderator') return NextResponse.json({ error: 'Модератор не пишет в диалоги сторон' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(messageSchema, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    if (!rateLimit(`message:${user.id}`, 60, 10 * 60 * 1000).ok) {
      return NextResponse.json({ error: 'Слишком много сообщений. Подождите немного.' }, { status: 429 })
    }

    const now = new Date()
    const fromBusiness = side === 'business'
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId: id, senderId: user.id, fromBusiness, body: parsed.data.body, createdAt: now },
        select: MESSAGE_SELECT,
      }),
      prisma.conversation.update({
        where: { id },
        data: { lastMessageAt: now, ...(fromBusiness ? { businessReadAt: now } : { universityReadAt: now }) },
      }),
    ])

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Message send error:', error)
    return NextResponse.json({ error: 'Не удалось отправить сообщение' }, { status: 500 })
  }
}
