import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { conversationStartSchema, parseBody } from '@/lib/schemas'

/**
 * Начало диалога бизнеса с командой вуза.
 *
 *  - Бизнес пишет команде проекта с витрины: нужен projectId.
 *  - Представитель вуза откликается на запрос бизнеса: нужен requestId и,
 *    по желанию, projectId своего проекта, который он предлагает.
 *
 * Повторное обращение по той же паре не создаёт второй диалог, а дописывает
 * сообщение в существующий.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireApiRole(request, [UserRole.BUSINESS, UserRole.UNIVERSITY_REP])
    if (response) return response

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(conversationStartSchema, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { projectId, requestId, message } = parsed.data

    if (!rateLimit(`conversation-start:${user.id}`, 20, 60 * 60 * 1000).ok) {
      return NextResponse.json({ error: 'Слишком много сообщений. Попробуйте позже.' }, { status: 429 })
    }

    const fromBusiness = user.role === UserRole.BUSINESS
    let businessUserId: string
    let universityId: string
    let linkedProjectId: string | null = null
    let linkedRequestId: string | null = null

    if (fromBusiness) {
      if (!projectId) return NextResponse.json({ error: 'Не указан проект' }, { status: 400 })
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, universityId: true, publication: true },
      })
      if (!project || project.publication !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Проект не найден' }, { status: 404 })
      }
      businessUserId = user.id
      universityId = project.universityId
      linkedProjectId = project.id

      // Диалог может продолжать тему запроса бизнеса — но только своего
      if (requestId) {
        const own = await prisma.businessRequest.findFirst({ where: { id: requestId, authorId: user.id }, select: { id: true } })
        if (own) linkedRequestId = own.id
      }
    } else {
      if (!user.universityId) return NextResponse.json({ error: 'Учётная запись не привязана к вузу' }, { status: 403 })
      if (!requestId) return NextResponse.json({ error: 'Не указана задача партнёра' }, { status: 400 })
      const businessRequest = await prisma.businessRequest.findUnique({
        where: { id: requestId },
        select: { id: true, authorId: true, status: true },
      })
      if (!businessRequest || businessRequest.status !== 'OPEN') {
        return NextResponse.json({ error: 'Задача не найдена или уже закрыта' }, { status: 404 })
      }
      businessUserId = businessRequest.authorId
      universityId = user.universityId
      linkedRequestId = businessRequest.id

      // Предложить можно только опубликованный проект своего вуза
      if (projectId) {
        const own = await prisma.project.findFirst({
          where: { id: projectId, universityId, publication: 'PUBLISHED' },
          select: { id: true },
        })
        if (!own) return NextResponse.json({ error: 'Предложить можно только опубликованный проект своего вуза' }, { status: 400 })
        linkedProjectId = own.id
      }
    }

    const existing = await prisma.conversation.findFirst({
      where: fromBusiness
        ? { businessUserId, projectId: linkedProjectId }
        : { businessUserId, universityId, requestId: linkedRequestId },
      select: { id: true },
    })

    const now = new Date()
    const conversation = existing
      ? await prisma.conversation.update({
          where: { id: existing.id },
          data: {
            lastMessageAt: now,
            ...(fromBusiness ? { businessReadAt: now } : { universityReadAt: now }),
            ...(linkedProjectId && !fromBusiness ? { projectId: linkedProjectId } : {}),
            messages: { create: { senderId: user.id, fromBusiness, body: message } },
          },
          select: { id: true },
        })
      : await prisma.conversation.create({
          data: {
            businessUserId,
            universityId,
            projectId: linkedProjectId,
            requestId: linkedRequestId,
            lastMessageAt: now,
            ...(fromBusiness ? { businessReadAt: now } : { universityReadAt: now }),
            messages: { create: { senderId: user.id, fromBusiness, body: message } },
          },
          select: { id: true },
        })

    if (!existing) await audit(user, 'CREATE', 'conversation', conversation.id, fromBusiness ? 'партнёр написал команде проекта' : 'вуз предложил решение задачи партнёра')
    return NextResponse.json({ id: conversation.id }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('Conversation start error:', error)
    return NextResponse.json({ error: 'Не удалось отправить сообщение' }, { status: 500 })
  }
}
