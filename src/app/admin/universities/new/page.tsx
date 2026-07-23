export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { UniversityForm } from '@/components/forms/UniversityForm'
import { BackButton } from '@/components/admin/BackButton'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/auth'

export default async function NewUniversityPage() {
  await requireRole([UserRole.ADMIN, UserRole.EDITOR], '/admin/universities/new')

  const regions = await prisma.region.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <BackButton fallback="/admin/universities" />
      <h1 className="text-xl font-bold text-slate-800 mb-6">Добавить вуз</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <UniversityForm regions={regions} />
      </div>
    </div>
  )
}
