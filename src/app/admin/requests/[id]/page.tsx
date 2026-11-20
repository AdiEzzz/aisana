export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { ArrowLeft, Briefcase } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { canModerate } from '@/lib/publication'
import { formatDateLong } from '@/lib/utils'
import { industryLabel } from '@/lib/industries'
import { RequestStatusBadge, RequestStatusControl } from '@/components/business/RequestStatusControl'
import { StartChat } from '@/components/business/StartChat'

/** Запрос бизнеса глазами вуза: описание задачи и отклик. */
export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole([UserRole.ADMIN, UserRole.EDITOR, UserRole.UNIVERSITY_REP], '/admin/requests')
  const { id } = await params
  const moderator = canModerate(user)

  const request = await prisma.businessRequest.findUnique({
    where: { id },
    include: {
      author: { select: { organization: true, name: true } },
      conversations: {
        where: moderator ? {} : { universityId: user.universityId || '__none__' },
        include: { university: { select: { name: true, shortName: true } } },
      },
    },
  })
  // Представитель вуза видит только открытые запросы и те, на которые уже откликнулся
  if (!request) notFound()
  if (!moderator && request.status !== 'OPEN' && request.conversations.length === 0) notFound()

  const ownProjects = user.role === UserRole.UNIVERSITY_REP && user.universityId
    ? await prisma.project.findMany({
        where: { universityId: user.universityId, publication: 'PUBLISHED' },
        orderBy: { title: 'asc' },
        select: { id: true, title: true },
      })
    : []

  const mine = moderator ? null : request.conversations[0]

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Link href="/admin/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Задачи партнёров
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            {moderator
              ? <RequestStatusControl id={request.id} status={request.status} moderator />
              : <RequestStatusBadge status={request.status} />}
            {request.industry && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{industryLabel(request.industry)}</span>}
            <span className="ml-auto text-xs text-slate-400">{formatDateLong(request.createdAt)}</span>
          </div>
          <h1 className="mb-3 text-xl font-bold text-slate-800">{request.title}</h1>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{request.description}</p>
          {request.expectation && (
            <p className="mt-3 text-sm text-slate-600"><span className="font-medium text-slate-700">Чего ждёт партнёр: </span>{request.expectation}</p>
          )}
          <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-sm text-slate-500">
            <Briefcase size={14} className="text-slate-400" /> {request.author.organization || request.author.name || 'Организация не указана'}
          </p>
        </div>

        {moderator && (
          <div className="mt-6">
            <h2 className="mb-3 font-semibold text-slate-700">Предложения вузов ({request.conversations.length})</h2>
            <div className="space-y-2">
              {request.conversations.map(conversation => (
                <Link key={conversation.id} href={`/admin/chats/${conversation.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 hover:border-blue-300">
                  {conversation.university.name}
                </Link>
              ))}
              {request.conversations.length === 0 && <p className="text-sm text-slate-400">Предложений пока нет.</p>}
            </div>
          </div>
        )}
      </div>

      <div>
        {mine ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 font-semibold text-slate-700">Вы уже предложили решение</h2>
            <Link href={`/admin/chats/${mine.id}`} className="text-sm font-medium text-blue-600 hover:underline">Открыть диалог →</Link>
          </div>
        ) : user.role === UserRole.UNIVERSITY_REP && request.status === 'OPEN' ? (
          <StartChat
            requestId={request.id}
            chatBasePath="/admin/chats"
            title="Предложить решение"
            hint="Напишите партнёру, чем вуз может помочь, и выберите проект, который предлагаете."
            placeholder="Что у вас уже есть по этой задаче, где работает и что нужно для пилота"
            buttonLabel="Предложить решение"
            projectOptions={ownProjects}
          />
        ) : null}
      </div>
    </div>
  )
}
