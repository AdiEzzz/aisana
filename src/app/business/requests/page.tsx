import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { formatDateLong } from '@/lib/utils'
import { industryLabel } from '@/lib/industries'
import { RequestStatusBadge } from '@/components/business/RequestStatusControl'

/** Запросы представителя бизнеса: задачи, под которые он ищет решение. */
export default async function BusinessRequestsPage() {
  const user = await requireRole([UserRole.BUSINESS, UserRole.ADMIN, UserRole.EDITOR], '/business/requests')
  const requests = await prisma.businessRequest.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { conversations: true } } },
  })

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Мои задачи</h1>
          <p className="mt-1 text-sm text-slate-500">Опишите задачу — команды вузов увидят её и предложат решение для совместного пилота.</p>
        </div>
        <Link href="/business/requests/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus size={14} /> Новая задача
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          Задач пока нет.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(request => (
            <Link key={request.id} href={`/business/requests/${request.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <RequestStatusBadge status={request.status} />
                {request.industry && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{industryLabel(request.industry)}</span>}
                <span className="ml-auto text-xs text-slate-400">{formatDateLong(request.createdAt)}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">{request.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{request.description}</p>
              <p className="mt-2 text-xs text-slate-400">Предложений вузов: {request._count.conversations}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
