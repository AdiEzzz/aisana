import { UserRole, type ProjectIndustry, type ProjectStatus } from '@prisma/client'
import { INDUSTRIES } from '@/lib/industries'
import { prisma } from '@/lib/prisma'
import { PUBLISHED_ONLY } from '@/lib/publication'
import { unstable_cache } from 'next/cache'
import { cached } from '@/lib/data-cache'
import { hasDemo, hasDocuments, isConfirmed } from '@/lib/card-checklist'
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

/** Сколько знаков описания хранит витрина: хватает и карточке, и подбору с ИИ. */
const DESCRIPTION_PREVIEW = 420

/** Решение витрины: только то, что нужно карточке, фильтрам и подбору. */
export interface ShowcaseItem {
  id: string
  title: string
  description: string
  status: ProjectStatus
  industry: ProjectIndustry | null
  implementedAt: string | null
  university: { name: string; shortName: string | null }
  topics: { topic: string }[]
  hasDocuments: boolean
  hasDemo: boolean
}

/**
 * Все решения витрины: опубликованные и подтверждённые (есть описание и
 * хотя бы документ или демо), любых стадий.
 *
 * Это самая тяжёлая выборка кабинета: все опубликованные карточки с файлами
 * и направлениями. Раньше она выполнялась на каждый поиск и каждый щелчок по
 * фильтру. Теперь набор собирается раз в две минуты и хранится в кэше данных
 * Next.js (общий для всех экземпляров на Vercel), а поиск и фильтры работают
 * по нему в памяти. Плата — новая или исправленная карточка появляется на
 * витрине с задержкой до двух минут.
 */
const loadShowcaseFromDb = unstable_cache(
  async (): Promise<ShowcaseItem[]> => {
    const projects = await prisma.project.findMany({
      where: PUBLISHED_ONLY,
      select: {
        id: true,
        title: true,
        description: true,
        impact: true,
        results: true,
        status: true,
        industry: true,
        implementedAt: true,
        agentPassportPdf: true,
        presentationPdf: true,
        presentationPptx: true,
        videoUrl: true,
        files: { select: { type: true, url: true } },
        topics: { where: { score: { gte: TOPIC_MIN_SCORE } }, orderBy: { score: 'desc' }, select: { topic: true } },
        university: { select: { name: true, shortName: true } },
      },
      orderBy: [{ isBestPractice: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
    })

    return projects.filter(isConfirmed).map(project => {
      const description = project.description.replace(/\s+/g, ' ').trim()
      return {
        id: project.id,
        title: project.title,
        description: description.length > DESCRIPTION_PREVIEW ? `${description.slice(0, DESCRIPTION_PREVIEW)}…` : description,
        status: project.status,
        industry: project.industry,
        implementedAt: project.implementedAt,
        university: project.university,
        topics: project.topics,
        hasDocuments: hasDocuments(project),
        hasDemo: hasDemo(project),
      }
    })
  },
  ['showcase-base-v1'],
  { revalidate: 120, tags: ['showcase'] },
)

/** Тот же набор с кэшем в памяти экземпляра: повторные запросы не ходят даже в кэш данных. */
export function loadShowcaseBase(): Promise<ShowcaseItem[]> {
  return cached('showcase-base', 60_000, () => loadShowcaseFromDb())
}

/** Идентификаторы решений по поисковому запросу, от самого подходящего. */
async function searchIds(query: string, options: { limit: number; minScore?: number; broad?: boolean }): Promise<string[]> {
  const { hits } = searchIndex(await loadSearchIndex(), query.slice(0, 600), options)
  return hits.map(hit => hit.id)
}

/**
 * Решения витрины по фильтрам. По умолчанию — от стадии «Пилот»: партнёру
 * нужны решения, которые уже работают.
 */
export async function loadShowcase(filters: ShowcaseFilters): Promise<ShowcaseItem[]> {
  const statuses: ProjectStatus[] | null =
    filters.status && ['IDEA', 'PROTOTYPE', 'PILOT', 'IMPLEMENTED', 'SCALED'].includes(filters.status)
      ? [filters.status as ProjectStatus]
      : filters.all ? null : READY_STATUSES
  const industry = filters.industry && INDUSTRIES.some(item => item.value === filters.industry) ? filters.industry : null
  const query = (filters.q ?? '').trim()

  const [base, ids] = await Promise.all([
    loadShowcaseBase(),
    query ? searchIds(query, { limit: 200 }) : null,
  ])

  const found = base.filter(project =>
    (!statuses || statuses.includes(project.status)) &&
    (!industry || project.industry === industry) &&
    (!filters.topic || project.topics.some(item => item.topic === filters.topic)),
  )
  if (!ids) return found

  // При поиске порядок — по релевантности, а не по дате
  const order = new Map(ids.map((id, at) => [id, at]))
  return found.filter(project => order.has(project.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!)
}

/** Решения с витрины, подходящие под задачу партнёра: поиск по её тексту. */
export async function matchProjectsForRequest(request: { title: string; description: string }, limit = 6) {
  const [base, ids] = await Promise.all([
    loadShowcaseBase(),
    searchIds(`${request.title} ${request.description}`, { limit: 40, minScore: 25 }),
  ])
  const byId = new Map(base.map(project => [project.id, project]))
  return ids.filter(id => byId.has(id)).slice(0, limit).map(id => byId.get(id)!)
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
  const [base, ids] = await Promise.all([loadShowcaseBase(), searchIds(task, { limit: 120, broad: true })])
  const byId = new Map(base.map(project => [project.id, project]))
  const candidates = ids.filter(id => byId.has(id)).slice(0, 40).map(id => byId.get(id)!)
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
