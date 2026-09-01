import { NextRequest, NextResponse } from 'next/server'
import { FeedbackStatus, FeedbackTopic, UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/auth'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

const TOPICS = new Set<string>(Object.values(FeedbackTopic))
const STATUSES = new Set<string>(Object.values(FeedbackStatus))

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Приём обращения с публичной страницы «Контакты». */
export async function POST(request: NextRequest) {
  try {
    // Общий предохранитель от флуда: считает все попытки, включая неудачные
    const ip = getClientIp(request)
    if (!rateLimit(`feedback:flood:${ip}`, 30, 10 * 60 * 1000).ok) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже или напишите на почту.' },
        { status: 429 }
      )
    }

    const data = await request.json().catch(() => ({}))

    // Honeypot: поле скрыто от людей, боты его заполняют.
    // Отвечаем успехом, чтобы бот не подбирал обход.
    if (typeof data.website === 'string' && data.website.trim() !== '') {
      return NextResponse.json({ ok: true })
    }

    const name = String(data.name || '').trim().slice(0, 120)
    const email = String(data.email || '').trim().toLowerCase().slice(0, 160)
    const message = String(data.message || '').trim().slice(0, 4000)
    const organization = String(data.organization || '').trim().slice(0, 200) || null
    const topic = TOPICS.has(String(data.topic)) ? (data.topic as FeedbackTopic) : FeedbackTopic.QUESTION

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Заполните имя, email и текст обращения' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Проверьте адрес электронной почты' }, { status: 400 })
    }
    if (message.length < 10) {
      return NextResponse.json({ error: 'Опишите обращение подробнее (минимум 10 символов)' }, { status: 400 })
    }

    // Лимит на сохранённые обращения считаем только после проверки формы,
    // чтобы опечатки в почте не съедали квоту добросовестного пользователя.
    const short = rateLimit(`feedback:sent:${ip}`, 3, 10 * 60 * 1000)
    const long = rateLimit(`feedback:day:${ip}`, 10, 24 * 60 * 60 * 1000)
    if (!short.ok || !long.ok) {
      return NextResponse.json(
        { error: 'Слишком много обращений. Попробуйте позже или напишите на почту.' },
        { status: 429 }
      )
    }

    await prisma.feedback.create({
      data: { topic, name, email, organization, message },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Feedback create error:', error)
    return NextResponse.json({ error: 'Не удалось отправить обращение' }, { status: 500 })
  }
}

/** Смена статуса обращения — только для администраторов и редакторов. */
export async function PATCH(request: NextRequest) {
  try {
    const { user, response } = await requireApiRole(request, [UserRole.ADMIN, UserRole.EDITOR])
    if (response) return response

    const data = await request.json().catch(() => ({}))
    const id = String(data.id || '')
    const status = String(data.status || '')

    if (!id || !STATUSES.has(status)) {
      return NextResponse.json({ error: 'Нужны id и корректный статус' }, { status: 400 })
    }

    const feedback = await prisma.feedback.update({
      where: { id },
      data: {
        status: status as FeedbackStatus,
        handledAt: status === FeedbackStatus.DONE ? new Date() : null,
      },
      select: { id: true, status: true },
    })

    await audit(user, 'UPDATE', 'feedback', feedback.id, `статус: ${status}`)
    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Feedback update error:', error)
    return NextResponse.json({ error: 'Не удалось обновить обращение' }, { status: 500 })
  }
}
