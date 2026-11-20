import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessUniversity, requireApiUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { isDescriptionEmpty } from '@/lib/project-completeness'
import { searchMarketAnalogs } from '@/lib/gemini-assist'

/**
 * Аналоги проекта на рынке — по запросу пользователя со страницы проекта.
 * ИИ ищет их в интернете; если поиск недоступен, отвечает по памяти с пометкой.
 * Ответ модели кэшируется на месяц, поэтому повторные открытия квоту не тратят.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(request)
    if (response) return response

    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      select: { title: true, description: true, publication: true, universityId: true },
    })
    if (!project) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    if (project.publication !== 'PUBLISHED' && !canAccessUniversity(user, project.universityId)) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    }

    // По одному названию модель начинает угадывать — без описания не спрашиваем
    if (isDescriptionEmpty(project.description)) {
      return NextResponse.json({ analogs: [], sources: [], online: false, reason: 'no-description' })
    }

    const limit = rateLimit(`analogs:${user.id}`, 20, 60 * 60 * 1000)
    if (!limit.ok) {
      return NextResponse.json({ error: 'Слишком много запросов. Попробуйте позже.' }, { status: 429 })
    }

    const result = await searchMarketAnalogs({ title: project.title, description: project.description })
    if (result === null) {
      return NextResponse.json({ error: 'ИИ сейчас недоступен. Попробуйте позже.' }, { status: 503 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Market analogs error:', error)
    return NextResponse.json({ error: 'Не удалось подобрать аналоги' }, { status: 500 })
  }
}
