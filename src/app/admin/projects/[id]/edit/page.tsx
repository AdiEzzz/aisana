export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { BackButton } from '@/components/admin/BackButton'
import { UserRole } from '@prisma/client'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { prisma } from '@/lib/prisma'
import { canAccessUniversity, requireRole } from '@/lib/auth'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole([UserRole.ADMIN, UserRole.EDITOR, UserRole.UNIVERSITY_REP], '/admin/projects')
  const { id } = await params

  const [project, universities, technologies] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        technologies: true,
        files: { orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.university.findMany({
      where: user.role === UserRole.UNIVERSITY_REP ? { id: user.universityId || '__none__' } : {},
      orderBy: { name: 'asc' },
    }),
    prisma.technology.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!project || !canAccessUniversity(user, project.universityId)) notFound()

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <BackButton fallback="/admin/projects" />
        <a
          href={`/projects/${project.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-3 py-1.5 rounded-lg mb-6 transition-colors"
        >
          <ExternalLink size={13} /> Открыть на сайте
        </a>
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">
        Редактировать: {project.title}
      </h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <ProjectForm
          universities={universities}
          technologies={technologies}
          project={project as any}
        />
      </div>
    </div>
  )
}
