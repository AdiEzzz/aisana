import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireApiRole } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { assistSchema, parseBody } from '@/lib/schemas'
import { suggestCardText } from '@/lib/gemini-assist'

/**
 * ИИ-помощник карточки: предлагает текст полей по тому, что уже введено.
 *
 * Ничего не сохраняет. Предложения возвращаются в форму, автор принимает
 * или отклоняет каждое и сохраняет карточку сам.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireApiRole(request, [
      UserRole.ADMIN, UserRole.EDITOR, UserRole.UNIVERSITY_REP,
    ])
    if (response) return response

    // Лимит по учётной записи, а не по IP: запросы к модели стоят квоты
    const limit = rateLimit(`assist:${user.id}`, 15, 60 * 60 * 1000)
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Слишком много запросов к помощнику. Повторите через ${Math.ceil(limit.retryAfterSec / 60)} мин.` },
        { status: 429 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(assistSchema, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const suggestions = await suggestCardText(parsed.data)
    if (!suggestions) {
      return NextResponse.json(
        { error: 'ИИ-помощник сейчас недоступен. Попробуйте позже.' },
        { status: 503 },
      )
    }

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Card assist error:', error)
    return NextResponse.json({ error: 'Не удалось получить предложения' }, { status: 500 })
  }
}
