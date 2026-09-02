import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canAccessUniversity, requireApiRole } from '@/lib/auth'
import { deleteUpload } from '@/lib/uploads'
import { invalidateSearchIndex, reclassifyProject } from '@/lib/search/store'
import { audit } from '@/lib/audit'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: { university: { include: { region: true } }, technologies: true, hearings: { orderBy: { date: 'desc' } } },
    })
    if (!project) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    return NextResponse.json(project)
  } catch {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiRole(request, [UserRole.ADMIN, UserRole.EDITOR, UserRole.UNIVERSITY_REP])
    if (response) return response

    const { id } = await params
    const existing = await prisma.project.findUnique({ where: { id }, select: { universityId: true } })
    if (!existing) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    if (!canAccessUniversity(user, existing.universityId)) {
      return NextResponse.json({ error: 'Недостаточно прав для этого проекта' }, { status: 403 })
    }

    const data = await request.json()
    const universityId = user.role === UserRole.UNIVERSITY_REP ? existing.universityId : data.universityId
    if (!canAccessUniversity(user, universityId)) {
      return NextResponse.json({ error: 'Недостаточно прав для этого вуза' }, { status: 403 })
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        universityId,
        leadName: data.leadName || null,
        leadEmail: data.leadEmail || null,
        teamSize: data.teamSize ? parseInt(data.teamSize) : null,
        launchDate: data.launchDate ? new Date(data.launchDate) : null,
        category: data.category,
        status: data.status,
        isBestPractice: data.isBestPractice || false,
        isScalable: data.isScalable || false,
        impact: data.impact || null,
        results: data.results || null,
        presentationPdf: data.presentationPdf || null,
        presentationPptx: data.presentationPptx || null,
        zoomLink: data.zoomLink || null,
        videoUrl: data.videoUrl || null,
        documentation: data.documentation || null,
        tags: data.tags || [],
        technologies: { set: data.technologyIds?.map((technologyId: string) => ({ id: technologyId })) || [] },
      },
    })
    // Текст изменился — пересчитываем направления и сбрасываем индекс
    await reclassifyProject(project.id, prisma).catch(err =>
      console.error('Не удалось классифицировать проект', project.id, err))
    invalidateSearchIndex()

    await audit(user, 'UPDATE', 'project', project.id, project.title)
    revalidatePath(`/projects/${project.id}`)
    revalidatePath(`/universities/${project.universityId}`)
    return NextResponse.json(project)
  } catch {
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiRole(request, [UserRole.ADMIN, UserRole.EDITOR, UserRole.UNIVERSITY_REP])
    if (response) return response

    const { id } = await params
    const existing = await prisma.project.findUnique({
      where: { id },
      select: {
        universityId: true,
        agentPassportPdf: true,
        files: { select: { url: true } },
      },
    })
    if (!existing) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    if (!canAccessUniversity(user, existing.universityId)) {
      return NextResponse.json({ error: 'Недостаточно прав для этого проекта' }, { status: 403 })
    }

    // hearings и project_files удалятся каскадом (onDelete: Cascade в схеме)
    await prisma.project.delete({ where: { id } })

    // Чистим локально загруженные файлы проекта с диска,
    // чтобы они не оставались сиротами в volume загрузок
    await deleteUpload(existing.agentPassportPdf)
    for (const file of existing.files) {
      await deleteUpload(file.url)
    }

    invalidateSearchIndex()
    await audit(user, 'DELETE', 'project', id)
    revalidatePath(`/projects/${id}`)
    revalidatePath(`/universities/${existing.universityId}`)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}
