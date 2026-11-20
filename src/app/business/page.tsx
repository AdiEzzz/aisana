import { Suspense } from 'react'
import Link from 'next/link'
import { UserRole } from '@prisma/client'
import { Building2, FileText, Loader2, MapPin, PlayCircle, Sparkles } from 'lucide-react'
import { requireRole } from '@/lib/auth'
import { loadShowcase, logPartnerSearch, matchShowcaseForTask, topicCounts, type ShowcaseItem } from '@/lib/business'
import { TOPIC_BY_ID, type TopicId } from '@/lib/search/taxonomy'
import { industryLabel } from '@/lib/industries'
import { StatusBadge } from '@/components/ui/status-badge'
import { ShowcaseSearchForm } from '@/components/business/ShowcaseSearchForm'

const PAGE_SIZE = 24

/** Стадии языком партнёра: чего ждать от решения на каждой. */
const STAGE_HINTS: Record<string, string> = {
  IDEA: 'Концепция: команда готова собрать прототип под вашу задачу.',
  PROTOTYPE: 'Рабочий макет: для проверки нужны реальные данные.',
  PILOT: 'Проверено в вузе: готово к пилоту у партнёра.',
  IMPLEMENTED: 'Работает в вузе: возможна адаптация под вашу организацию.',
  SCALED: 'Работает в нескольких местах: возможна адаптация под вашу организацию.',
}

/** Короче этого — не описание задачи: ИИ нечего подбирать, показываем обычный поиск. */
const MIN_TASK_LENGTH = 12

const PARTNER_ROLES = [UserRole.BUSINESS, UserRole.ADMIN, UserRole.EDITOR]

type Params = { q?: string; topic?: string; industry?: string; status?: string; all?: string; page?: string; ai?: string }

const topicLabel = (topic: string) => TOPIC_BY_ID.get(topic as TopicId)?.label ?? topic

function SolutionCard({ project, fit, reason }: { project: ShowcaseItem; fit?: 'direct' | 'adaptable' | null; reason?: string }) {
  return (
    <Link href={`/projects/${project.id}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={project.status} size="sm" />
        {fit === 'direct' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">решает задачу</span>}
        {fit === 'adaptable' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">нужна адаптация</span>}
        {!fit && project.industry && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{industryLabel(project.industry)}</span>
        )}
        {!fit && !project.industry && project.topics.slice(0, 2).map(({ topic }) => (
          <span key={topic} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{topicLabel(topic)}</span>
        ))}
      </div>
      <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-800 group-hover:text-blue-600">{project.title}</h3>
      {reason ? (
        <p className="mb-3 rounded-lg bg-violet-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          <Sparkles size={11} className="mr-1 inline text-violet-500" />{reason}
        </p>
      ) : (
        <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-slate-500">{project.description}</p>
      )}
      <div className="mt-auto space-y-1.5 text-xs text-slate-500">
        <p className="flex items-center gap-1.5"><Building2 size={12} className="text-slate-400" /> {project.university.shortName || project.university.name}</p>
        {STAGE_HINTS[project.status] && <p className="text-slate-400">{STAGE_HINTS[project.status]}</p>}
        {project.implementedAt && (
          <p className="flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" /> <span className="line-clamp-1">Внедрено: {project.implementedAt}</span></p>
        )}
        <p className="flex flex-wrap gap-3 pt-1">
          {project.hasDocuments && <span className="inline-flex items-center gap-1 text-emerald-700"><FileText size={12} /> документы</span>}
          {project.hasDemo && <span className="inline-flex items-center gap-1 text-emerald-700"><PlayCircle size={12} /> демо</span>}
        </p>
      </div>
    </Link>
  )
}

/** Заготовка на время загрузки: те же блоки, что и у результатов, без данных. */
function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка решений">
      <div className="mb-4 h-5 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, at) => (
          <div key={at} className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 h-4 w-24 rounded bg-slate-100" />
            <div className="mb-2 h-4 w-3/4 rounded bg-slate-100" />
            <div className="mb-1 h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-5/6 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Подбор под задачу: грузится отдельно, чтобы ответ ИИ не задерживал остальное. */
async function TaskPicks({ task }: { task: string }) {
  await requireRole(PARTNER_ROLES, '/business')
  const { ai, picks, candidates } = await matchShowcaseForTask(task)
  const requestHref = `/business/requests/new?description=${encodeURIComponent(task.slice(0, 1500))}`

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Sparkles size={16} className="text-violet-500" />
        <h2 className="font-semibold text-slate-800">Подобрано под вашу задачу</h2>
        <span className="text-xs text-slate-400">
          {ai ? `ИИ просмотрел ${candidates} решений и выбрал подходящие` : 'ИИ сейчас недоступен — показаны результаты поиска по словам'}
        </span>
      </div>

      {picks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Готового решения под эту задачу на витрине не нашлось.{' '}
          <Link href={requestHref} className="font-medium text-blue-600 hover:underline">Опубликуйте задачу</Link>
          {' '}— вузы увидят задачу и предложат решение.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {picks.map(pick => <SolutionCard key={pick.project.id} project={pick.project} fit={pick.fit} reason={pick.reason} />)}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Не то, что нужно?{' '}
            <Link href={requestHref} className="font-medium text-blue-600 hover:underline">Опубликуйте задачу</Link>
            {' '}— вузы предложат решение сами.
          </p>
        </>
      )}
    </section>
  )
}

/** Результаты витрины: список решений, направления и страницы. */
async function Results({ params, query, withAi }: { params: Params; query: string; withAi: boolean }) {
  const user = await requireRole(PARTNER_ROLES, '/business')
  const all = params.all === '1'

  // Счётчики направлений считаем по витрине без фильтра направления,
  // иначе после выбора одного остальные исчезли бы из списка
  const [projects, unfiltered] = await Promise.all([
    loadShowcase({ q: query, topic: params.topic, industry: params.industry, status: params.status, all }),
    params.topic ? loadShowcase({ q: query, industry: params.industry, status: params.status, all }) : null,
  ])
  const topics = topicCounts(unfiltered ?? projects)

  // Что ищут партнёры и сколько находят — «карта спроса» для вузов и министерства.
  // Пишем только поиски самих партнёров и только с первой страницы.
  if (query && user.role === UserRole.BUSINESS && !params.page) {
    await logPartnerSearch(user, { query, topic: params.topic, withAi, results: projects.length })
  }

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE))
  const shown = projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    // Подбор с ИИ не переносим в ссылки фильтров и страниц: он запускается только кнопкой
    for (const [key, value] of Object.entries({ ...params, page: undefined, ai: undefined, ...changes })) if (value) next.set(key, value)
    const text = next.toString()
    return text ? `/business?${text}` : '/business'
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition-colors ${active ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-slate-800">{query ? 'Все результаты поиска' : 'Все решения витрины'}</h2>
        <span className="text-sm text-slate-500">{projects.length}</span>
        <span className="text-xs text-slate-400">— проекты с описанием и подтверждением: документом или демо</span>
      </div>

      {topics.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Link href={href({ topic: undefined })} className={chip(!params.topic)}>Все направления</Link>
          {topics.map(({ topic, count }) => (
            <Link key={topic} href={href({ topic })} className={chip(params.topic === topic)}>
              {topicLabel(topic)} <span className="text-slate-400">{count}</span>
            </Link>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          По этим условиям решений нет.{' '}
          {!all && <><Link href={href({ all: '1' })} className="font-medium text-blue-600 hover:underline">Показать идеи и прототипы</Link> или </>}
          <Link href={`/business/requests/new${query ? `?description=${encodeURIComponent(query)}` : ''}`} className="font-medium text-blue-600 hover:underline">опубликуйте задачу</Link>
          {' '}— вузы увидят её и предложат решение.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map(project => <SolutionCard key={project.id} project={project} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={href({ page: page > 2 ? String(page - 1) : undefined })} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:border-blue-300">← Назад</Link>}
          <span className="text-slate-500">Страница {page} из {totalPages}</span>
          {page < totalPages && <Link href={href({ page: String(page + 1) })} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:border-blue-300">Вперёд →</Link>}
        </div>
      )}
    </>
  )
}

/**
 * Витрина решений для партнёра: опубликованные проекты вузов, у которых есть
 * описание и подтверждение (документ или демо). По умолчанию — от стадии «Пилот».
 * Витрина и поиск по словам работают без ИИ. Подбор с ИИ — отдельной кнопкой.
 *
 * Страница отдаёт форму сразу, а результаты и подбор с ИИ подгружаются под
 * ней каждый в своём блоке: поиск не закрывает экран общей заставкой.
 * Роль проверяют сами блоки с данными — в форме данных нет.
 */
export default async function ShowcasePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const query = (params.q ?? '').trim()
  // Подбор с ИИ — только по отдельной кнопке: обычный поиск и витрина работают без него
  const withAi = params.ai === '1' && query.length >= MIN_TASK_LENGTH
  const tooShortForAi = params.ai === '1' && query.length < MIN_TASK_LENGTH
  const firstPage = !params.page || params.page === '1'
  // Смена условий поиска заново показывает заготовку вместо старых результатов
  const searchKey = JSON.stringify([query, params.topic, params.industry, params.status, params.all, params.page])

  return (
    <div>
      <ShowcaseSearchForm
        key={JSON.stringify([query, params.industry, params.status, params.all, params.topic])}
        query={query}
        industry={params.industry || ''}
        status={params.status || ''}
        all={params.all === '1'}
        topic={params.topic || ''}
      />

      {tooShortForAi && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Для подбора с ИИ опишите задачу подробнее — хотя бы одним предложением. Ниже результаты обычного поиска.
        </p>
      )}

      {withAi && firstPage && (
        <Suspense key={`ai:${query}`} fallback={
          <div className="mb-8 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin text-violet-500" /> ИИ читает карточки и подбирает решения под задачу…
          </div>
        }>
          <TaskPicks task={query} />
        </Suspense>
      )}

      <Suspense key={searchKey} fallback={<ResultsSkeleton />}>
        <Results params={params} query={query} withAi={withAi} />
      </Suspense>
    </div>
  )
}
