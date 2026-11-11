import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/auth'
import { deleteUpload } from '@/lib/uploads'
import { invalidateSearchIndex } from '@/lib/search/store'
import { audit } from '@/lib/audit'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const university = await prisma.university.findUnique({
      where: { id },
      include: { region: true, projects: { include: { technologies: true } } },
    })
    if (!university) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    return NextResponse.json(university)
  } catch {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiRole(request, [UserRole.ADMIN, UserRole.EDITOR])
    if (response) return response

    const { id } = await params
    const data = await request.json()
    const university = await prisma.university.update({
      where: { id },
      data: providedFields(data),
    })
    // Название, краткое имя и регион вуза индексируются поиском —
    // без сброса кэша переименование видно только через минуту
    invalidateSearchIndex()

    await audit(user, 'UPDATE', 'university', university.id, university.name)
    return NextResponse.json(university)
  } catch (error: any) {
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiRole(request, [UserRole.ADMIN])
    if (response) return response

    const { id } = await params

    // Собираем локальные файлы проектов вуза ДО удаления, чтобы почистить диск
    const projects = await prisma.project.findMany({
      where: { universityId: id },
      select: { agentPassportPdf: true, files: { select: { url: true } } },
    })

    await prisma.project.deleteMany({ where: { universityId: id } })
    await prisma.university.delete({ where: { id } })

    for (const p of projects) {
      await deleteUpload(p.agentPassportPdf)
      for (const f of p.files) await deleteUpload(f.url)
    }

    // Проекты вуза исчезли из выдачи — индекс поиска надо пересобрать
    invalidateSearchIndex()

    await audit(user, 'DELETE', 'university', id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}

/** Поля вуза, которые можно править через API. */
const EDITABLE_FIELDS = [
  'name', 'nameKz', 'shortName', 'regionId', 'address',
  'website', 'email', 'phone', 'rector', 'description', 'type',
] as const

/**
 * Только те поля, что реально пришли в теле запроса.
 *
 * Раньше все колонки писались через «|| null», и запрос без nameKz
 * обнулял его в базе — молчаливая потеря данных.
 */
function providedFields(data: Record<string, unknown>): Record<string, unknown> {
  const update: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) update[field] = data[field]
  }
  return update
}
