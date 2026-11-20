import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, Sparkles } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { canModerate } from '@/lib/publication'
import { matchProjectsForRequest } from '@/lib/business'
import { formatDateLong } from '@/lib/utils'
import { industryLabel } from '@/lib/industries'
import { StatusBadge } from '@/components/ui/status-badge'
import { RequestStatusControl } from '@/components/business/RequestStatusControl'

/** Запрос бизнеса глазами автора: подобранные решения и отклики вузов. */
export default async function BusinessRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole([UserRole.BUSINESS, UserRole.ADMIN, UserRole.EDITOR], '/business/requests')
  const { id } = await params

  const request = await prisma.businessRequest.findUnique({
    where: { id },
    include: {
      conversations: {
        orderBy: { lastMessageAt: 'desc' },
        include: {
          university: { select: { name: true, shortName: true } },
          project: { select: { title: true } },
          messages: { orderBy: { createdAt: 'asc' }, take: 1, select: { body: true } },
        },
      },
    },
  })
  if (!request || (request.authorId !== user.id && !canModerate(user))) notFound()

  const matches = await matchProjectsForRequest(request)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Link href="/business/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Мои задачи
        </Link>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <RequestStatusControl id={request.id} status={request.status} moderator={canModerate(user)} />
            {request.industry && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{industryLabel(request.industry)}</span>}
            <span className="ml-auto text-xs text-slate-400">{formatDateLong(request.createdAt)}</span>
          </div>
          <h1 className="mb-3 text-xl font-bold text-slate-800">{request.title}</h1>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{request.description}</p>
          {request.expectation && (
            <p className="mt-3 text-sm text-slate-600"><span className="font-medium text-slate-700">Чего ждёт партнёр: </span>{request.expectation}</p>
          )}
          {request.status === 'HIDDEN' && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Задача скрыта модератором и вузам не видна.{request.moderationNote ? ` Причина: ${request.moderationNote}` : ''}
            </p>
          )}
        </div>

        <h2 className="mb-3 font-semibold text-slate-700">Предложения вузов ({request.conversations.length})</h2>
        {request.conversations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400">
            Предложений пока нет. Когда вуз предложит решение, здесь появится диалог.
          </div>
        ) : (
          <div className="space-y-2">
            {request.conversations.map(conversation => (
              <Link key={conversation.id} href={`/business/chats/${conversation.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-300">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Building2 size={14} className="text-slate-400" /> {conversation.university.shortName || conversation.university.name}
                </p>
                {conversation.project && <p className="mt-1 text-xs text-slate-500">Предлагает проект: {conversation.project.title}</p>}
                {conversation.messages[0] && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{conversation.messages[0].body}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-700">
            <Sparkles size={15} className="text-violet-500" /> Подходящие решения
          </h2>
          <p className="mb-4 text-xs text-slate-400">Подобраны автоматически по тексту задачи среди решений витрины.</p>
          {matches.length === 0 ? (
            <p className="text-sm text-slate-500">Готовых решений под эту задачу на витрине не нашлось. Вузы увидят задачу и смогут предложить своё.</p>
          ) : (
            <div className="space-y-3">
              {matches.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`}
                  className="block rounded-lg border border-slate-100 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
                  <p className="text-sm font-medium text-slate-800">{project.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusBadge status={project.status} size="sm" />
                    <span className="text-xs text-slate-500">{project.university.shortName || project.university.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
