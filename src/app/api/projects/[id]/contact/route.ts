import { NextRequest, NextResponse } from 'next/server'
import { FeedbackTopic } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { parseBody, projectContactSchema } from '@/lib/schemas'

/**
 * «Связаться с командой»: сообщение команде проекта.
 *
 * Сообщение попадает в раздел «Обращения»: его видят модераторы и
 * представитель вуза-владельца, а отвечают они на почту отправителя.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(request)
    if (response) return response

    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, title: true, publication: true },
    })
    // Писать можно только по опубликованным проектам: остальные публично не видны
    if (!project || project.publication !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(projectContactSchema, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const hour = rateLimit(`contact:${user.id}`, 5, 60 * 60 * 1000)
    const sameProject = rateLimit(`contact:${user.id}:${project.id}`, 2, 24 * 60 * 60 * 1000)
    if (!hour.ok || !sameProject.ok) {
      return NextResponse.json(
        { error: 'Слишком много сообщений. Команда уже получила ваше обращение, попробуйте позже.' },
        { status: 429 },
      )
    }

    const feedback = await prisma.feedback.create({
      data: {
        topic: FeedbackTopic.PROJECT_CONTACT,
        name: user.name?.trim() || user.email,
        email: user.email.toLowerCase(),
        organization: parsed.data.organization ?? user.university?.name ?? null,
        message: parsed.data.message,
        projectId: project.id,
        userId: user.id,
      },
      select: { id: true },
    })

    await audit(user, 'CREATE', 'feedback', feedback.id, `сообщение команде проекта: ${project.title}`)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Project contact error:', error)
    return NextResponse.json({ error: 'Не удалось отправить сообщение' }, { status: 500 })
  }
}
