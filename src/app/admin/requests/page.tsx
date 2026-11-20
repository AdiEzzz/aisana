export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { BusinessRequestStatus, UserRole } from '@prisma/client'
import { Briefcase } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { canModerate } from '@/lib/publication'
import { formatDateLong } from '@/lib/utils'
import { INDUSTRIES, industryLabel } from '@/lib/industries'
import { RequestStatusBadge } from '@/components/business/RequestStatusControl'

/**
 * Запросы бизнеса: задачи, под которые компании ищут ИИ-решения.
 * Представитель вуза видит открытые запросы и может откликнуться;
 * модератор видит все, включая закрытые и скрытые.
 */
export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ industry?: string; status?: string }>
}) {
  const user = await requireRole([UserRole.ADMIN, UserRole.EDITOR, UserRole.UNIVERSITY_REP], '/admin/requests')
  const params = await searchParams
  const moderator = canModerate(user)

  const status = moderator && params.status && params.status in BusinessRequestStatus
    ? (params.status as BusinessRequestStatus)
    : moderator ? undefined : BusinessRequestStatus.OPEN

  const requests = await prisma.businessRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(params.industry && INDUSTRIES.some(industry => industry.value === params.industry) ? { industry: params.industry as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      author: { select: { organization: true, name: true } },
      conversations: { select: { universityId: true } },
    },
  })

  const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm'

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Задачи партнёров</h1>
      <p className="mb-5 text-sm text-slate-500">
        Партнёры — компании и организации — описывают задачи, которые хотят решить с помощью ИИ. Предложите проект вуза, если он подходит.
      </p>

      <form className="mb-5 flex flex-wrap gap-2">
        <select name="industry" defaultValue={params.industry || ''} className={inputCls}>
          <option value="">Все отрасли</option>
          {INDUSTRIES.map(industry => <option key={industry.value} value={industry.value}>{industry.ru}</option>)}
        </select>
        {moderator && (
          <select name="status" defaultValue={params.status || ''} className={inputCls}>
            <option value="">Все статусы</option>
            <option value="OPEN">Открытые</option>
            <option value="IN_PROGRESS">В работе</option>
            <option value="CLOSED">Закрытые</option>
            <option value="HIDDEN">Скрытые</option>
          </select>
        )}
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Показать</button>
      </form>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          Задач пока нет.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(request => {
            const answered = !moderator && request.conversations.some(conversation => conversation.universityId === user.universityId)
            return (
              <Link key={request.id} href={`/admin/requests/${request.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <RequestStatusBadge status={request.status} />
                  {request.industry && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{industryLabel(request.industry)}</span>}
                  {answered && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">вы предложили решение</span>}
                  <span className="ml-auto text-xs text-slate-400">{formatDateLong(request.createdAt)}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{request.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{request.description}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <Briefcase size={12} /> {request.author.organization || request.author.name || 'Организация не указана'}
                  {moderator && <> · предложений: {request.conversations.length}</>}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
