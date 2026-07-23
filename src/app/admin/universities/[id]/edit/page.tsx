export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { UniversityForm } from '@/components/forms/UniversityForm'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { BackButton } from '@/components/admin/BackButton'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/auth'

export default async function EditUniversityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole([UserRole.ADMIN, UserRole.EDITOR], '/admin/universities')

  const { id } = await params
  const [university, regions] = await Promise.all([
    prisma.university.findUnique({ where: { id } }),
    prisma.region.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!university) notFound()

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <BackButton fallback="/admin/universities" />
        <a
          href={`/universities/${university.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-3 py-1.5 rounded-lg mb-6 transition-colors"
        >
          <ExternalLink size={13} /> Открыть на сайте
        </a>
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">
        Редактировать: {university.shortName || university.name}
      </h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <UniversityForm regions={regions} university={university} />
      </div>
    </div>
  )
}
