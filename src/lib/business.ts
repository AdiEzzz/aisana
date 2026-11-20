import { UserRole, type ProjectIndustry, type ProjectStatus } from '@prisma/client'
import { INDUSTRIES } from '@/lib/industries'
import { prisma } from '@/lib/prisma'
import { PUBLISHED_ONLY } from '@/lib/publication'
import { isConfirmed } from '@/lib/card-checklist'
import { loadSearchIndex } from '@/lib/search/store'
import { searchIndex } from '@/lib/search/engine'
import { matchTask } from '@/lib/gemini-assist'

/**
 * Кабинет партнёра.
 *
 * Партнёр — представитель компании или организации — видит решения вузов,
 * публикует свои задачи и переписывается с командами. Здесь выборки, общие
 * для страниц и API; правила доступа — в business-access.
 */

import { type Actor, READY_STATUSES, conversationsWhere, isUnread } from '@/lib/business-access'

export { READY_STATUSES, conversationSide, conversationsWhere, isBusiness, isUnread } from '@/lib/business-access'

/** Сколько диалогов с непрочитанными сообщениями у пользователя. */
export async function unreadConversations(user: Actor): Promise<number> {
  const side = user.role === UserRole.BUSINESS ? 'business' : user.role === UserRole.UNIVERSITY_REP ? 'university' : null
  if (!side) return 0
  const rows = await prisma.conversation.findMany({
    where: conversationsWhere(user),
    select: { lastMessageAt: true, businessReadAt: true, universityReadAt: true },
  })
  return rows.filter(row => isUnread(side, row)).length
}

export interface ShowcaseFilters {
  q?: string
  /** Тематическое направление (см. lib/search/taxonomy) */
  topic?: string
  /** Отрасль применения */
  industry?: string
  status?: string
  /** true — показывать и идеи с прототипами */
  all?: boolean
}

/** Направление с меньшим коэффициентом проекту приписано слабо — в фильтр не берём. */
const TOPIC_MIN_SCORE = 45

const SHOWCASE_SELECT = {
  id: true,
  title: true,
  description: true,
  impact: true,
  results: true,
  status: true,
  category: true,
  industry: true,
  implementedAt: true,
  agentPassportPdf: true,
  presentationPdf: true,
  presentationPptx: true,
  videoUrl: true,
  files: { select: { type: true, url: true } },
  topics: { where: { score: { gte: TOPIC_MIN_SCORE } }, orderBy: { score: 'desc' }, select: { topic: true } },
  university: { select: { name: true, shortName: true, region: { select: { name: true } } } },
} as const

/**
 * Проекты витрины: опубликованные и подтверждённые (есть описание и хотя бы
 * документ или демо). По умолчанию — от стадии «Пилот»: бизнесу нужны
 * решения, которые уже работают.
 */
export async function loadShowcase(filters: ShowcaseFilters) {
  const statuses = filters.status && ['IDEA', 'PROTOTYPE', 'PILOT', 'IMPLEMENTED', 'SCALED'].includes(filters.status)
    ? [filters.status as ProjectStatus]
    : filters.all ? undefined : READY_STATUSES

  let ids: string[] | null = null
  const query = (filters.q ?? '').trim()
  if (query) {
    const { hits } = searchIndex(await loadSearchIndex(), query, { limit: 200 })
    ids = hits.map(hit => hit.id)
  }

  const projects = await prisma.project.findMany({
    where: {
      ...PUBLISHED_ONLY,
      ...(statuses ? { status: { in: statuses } } : {}),
      ...(filters.industry && INDUSTRIES.some(item => item.value === filters.industry)
        ? { industry: filters.industry as ProjectIndustry }
        : {}),
      ...(filters.topic ? { topics: { some: { topic: filters.topic, score: { gte: TOPIC_MIN_SCORE } } } } : {}),
      ...(ids ? { id: { in: ids } } : {}),
    },
    select: SHOWCASE_SELECT,
    orderBy: [{ isBestPractice: 'desc' }, { updatedAt: 'desc' }],
  })

  const confirmed = projects.filter(isConfirmed)
  if (!ids) return confirmed

  // При поиске порядок — по релевантности, а не по дате
  const order = new Map(ids.map((id, at) => [id, at]))
  return confirmed.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}

/** Решения с витрины, подходящие под запрос бизнеса: поиск по тексту запроса. */
export async function matchProjectsForRequest(request: { title: string; description: string }, limit = 6) {
  const { hits } = searchIndex(await loadSearchIndex(), `${request.title} ${request.description}`.slice(0, 600), {
    limit: 40,
    minScore: 25,
  })
  if (hits.length === 0) return []

  const projects = await prisma.project.findMany({
    where: { id: { in: hits.map(hit => hit.id) }, ...PUBLISHED_ONLY },
    select: SHOWCASE_SELECT,
  })
  const byId = new Map(projects.filter(isConfirmed).map(project => [project.id, project]))
  return hits
    .filter(hit => byId.has(hit.id))
    .slice(0, limit)
    .map(hit => ({ ...byId.get(hit.id)!, score: hit.score }))
}

/** Направления, по которым на витрине есть решения, с числом решений. */
export function topicCounts(projects: { topics: { topic: string }[] }[]): { topic: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const project of projects) {
    for (const { topic } of project.topics) counts.set(topic, (counts.get(topic) ?? 0) + 1)
  }
  return [...counts.entries()].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count)
}

/**
 * Подбор решений под задачу, описанную своими словами.
 *
 * Поиск по словам собирает до 40 кандидатов широким отбором, ИИ выбирает из
 * них подходящие и объясняет, чем каждое полезно. Если ИИ недоступен,
 * возвращаются кандидаты поиска без объяснений (ai: false).
 */
export async function matchShowcaseForTask(task: string) {
  const { hits } = searchIndex(await loadSearchIndex(), task.slice(0, 600), { limit: 120, broad: true })
  if (hits.length === 0) return { ai: true, picks: [], candidates: 0 }

  const projects = await prisma.project.findMany({
    where: { id: { in: hits.map(hit => hit.id) }, ...PUBLISHED_ONLY },
    select: SHOWCASE_SELECT,
  })
  const byId = new Map(projects.filter(isConfirmed).map(project => [project.id, project]))
  const candidates = hits.filter(hit => byId.has(hit.id)).slice(0, 40).map(hit => byId.get(hit.id)!)
  if (candidates.length === 0) return { ai: true, picks: [], candidates: 0 }

  const matches = await matchTask(task, candidates)
  if (matches === null) {
    return {
      ai: false,
      candidates: candidates.length,
      picks: candidates.slice(0, 8).map(project => ({ project, fit: null as 'direct' | 'adaptable' | null, reason: '' })),
    }
  }

  return {
    ai: true,
    candidates: candidates.length,
    picks: matches.map(match => ({ project: byId.get(match.id)!, fit: match.fit as 'direct' | 'adaptable' | null, reason: match.reason })),
  }
}

/**
 * Записывает поиск партнёра на витрине. Ошибку записи не поднимаем:
 * журнал не должен ломать витрину.
 */
export async function logPartnerSearch(
  user: { id: string; organization?: string | null },
  search: { query: string; topic?: string; withAi: boolean; results: number },
): Promise<void> {
  try {
    await prisma.partnerSearch.create({
      data: {
        userId: user.id,
        organization: user.organization ?? null,
        query: search.query.slice(0, 600),
        topic: search.topic ?? null,
        withAi: search.withAi,
        results: search.results,
      },
    })
  } catch (error) {
    console.error('Partner search log failed', error)
  }
}
