import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canAccessUniversity, requireApiRole } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireApiRole(request, [UserRole.ADMIN, UserRole.EDITOR, UserRole.UNIVERSITY_REP])
    if (response) return response

    const data = await request.json()
    const universityId = user.role === UserRole.UNIVERSITY_REP ? user.universityId : data.universityId

    if (!data.title || !data.description || !universityId) {
      return NextResponse.json({ error: 'Название, описание и вуз обязательны' }, { status: 400 })
    }

    if (!canAccessUniversity(user, universityId)) {
      return NextResponse.json({ error: 'Недостаточно прав для этого вуза' }, { status: 403 })
    }

    const project = await prisma.project.create({
      data: {
        title: data.title,
        description: data.description,
        universityId,
        leadName: data.leadName || null,
        leadEmail: data.leadEmail || null,
        teamSize: data.teamSize ? parseInt(data.teamSize) : null,
        launchDate: data.launchDate ? new Date(data.launchDate) : null,
        category: data.category || 'EDUCATION',
        status: data.status || 'IDEA',
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
        technologies: data.technologyIds?.length
          ? { connect: data.technologyIds.map((id: string) => ({ id })) }
          : undefined,
      },
    })

    await audit(user, 'CREATE', 'project', project.id, project.title)
    revalidatePath(`/universities/${project.universityId}`)
    return NextResponse.json(project, { status: 201 })
  } catch (error: any) {
    console.error('Create project error:', error)
    return NextResponse.json({ error: 'Ошибка создания проекта' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    const projects = await prisma.project.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { tags: { has: q } },
              ],
            }
          : {}),
        ...(status ? { status: status as any } : {}),
        ...(category ? { category: category as any } : {}),
      },
      include: {
        university: { include: { region: true } },
        technologies: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(projects)
  } catch {
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 })
  }
}
