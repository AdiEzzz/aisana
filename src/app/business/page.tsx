import { Suspense } from 'react'
import Link from 'next/link'
import { Building2, FileText, Loader2, MapPin, PlayCircle, Search, Sparkles } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { loadShowcase, logPartnerSearch, matchShowcaseForTask, topicCounts } from '@/lib/business'
import { hasDemo, hasDocuments } from '@/lib/card-checklist'
import { TOPIC_BY_ID, type TopicId } from '@/lib/search/taxonomy'
import { INDUSTRIES, industryLabel } from '@/lib/industries'
import { StatusBadge } from '@/components/ui/status-badge'

const STATUSES = [
  { value: 'PILOT', label: 'Пилот' },
  { value: 'IMPLEMENTED', label: 'Внедрено' },
  { value: 'SCALED', label: 'Масштабировано' },
]

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

type ShowcaseProject = Awaited<ReturnType<typeof loadShowcase>>[number]

const topicLabel = (topic: string) => TOPIC_BY_ID.get(topic as TopicId)?.label ?? topic

function SolutionCard({ project, fit, reason }: { project: ShowcaseProject; fit?: 'direct' | 'adaptable' | null; reason?: string }) {
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
          {hasDocuments(project) && <span className="inline-flex items-center gap-1 text-emerald-700"><FileText size={12} /> документы</span>}
          {hasDemo(project) && <span className="inline-flex items-center gap-1 text-emerald-700"><PlayCircle size={12} /> демо</span>}
        </p>
      </div>
    </Link>
  )
}

/** Подбор под задачу: грузится отдельно, чтобы ответ ИИ не задерживал страницу. */
async function TaskPicks({ task }: { task: string }) {
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
            {' '}— вузы откликнутся сами.
          </p>
        </>
      )}
    </section>
  )
}

/**
 * Витрина решений для бизнеса: опубликованные проекты вузов, у которых есть
 * описание и подтверждение (документ или демо). По умолчанию — от стадии «Пилот».
 * Витрина и поиск по словам работают без ИИ. Подбор с ИИ — отдельной кнопкой:
 * задачу описывают своими словами, ИИ выбирает решения и объясняет выбор.
 */
export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; topic?: string; industry?: string; status?: string; all?: string; page?: string; ai?: string }>
}) {
  // Страница проверяет роль сама: при переходе внутри кабинета layout заново не выполняется
  const user = await requireRole([UserRole.BUSINESS, UserRole.ADMIN, UserRole.EDITOR], '/business')
  const params = await searchParams
  const all = params.all === '1'
  const query = (params.q ?? '').trim()
  // Подбор с ИИ — только по отдельной кнопке: обычный поиск и витрина работают без него
  const withAi = params.ai === '1' && query.length >= MIN_TASK_LENGTH
  const tooShortForAi = params.ai === '1' && query.length < MIN_TASK_LENGTH

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

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      <form className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-lg font-bold text-slate-800">Витрина решений</h1>
        <p className="mb-3 mt-1 text-sm text-slate-500">
          Разработки команд казахстанских вузов программы AI-Sana. Решения открыты к совместному пилоту и доработке под задачи вашей организации. Ищите по словам или опишите задачу — ИИ подберёт решения и объяснит выбор.
        </p>
        <textarea name="q" defaultValue={query} rows={2} maxLength={600} className={`${inputCls} resize-none`}
          placeholder="Слова для поиска: чат-бот, распознавание документов. Или задача целиком: каждый день приходит 300 обращений клиентов, нужно определять тему и направлять в отдел" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Search size={14} /> Найти
          </button>
          <button type="submit" name="ai" value="1" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100">
            <Sparkles size={14} /> Подобрать с ИИ
          </button>
          <select name="industry" defaultValue={params.industry || ''} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">Все отрасли</option>
            {INDUSTRIES.map(industry => <option key={industry.value} value={industry.value}>{industry.ru}</option>)}
          </select>
          <select name="status" defaultValue={params.status || ''} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">От пилота и выше</option>
            {STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" name="all" value="1" defaultChecked={all} className="h-4 w-4 rounded" />
            Показывать также идеи и прототипы
          </label>
          {params.topic && <input type="hidden" name="topic" value={params.topic} />}
          {(query || params.topic || params.industry || params.status || all) && (
            <Link href="/business" className="ml-auto text-sm text-slate-500 hover:text-slate-700">Сбросить</Link>
          )}
        </div>
      </form>

      {tooShortForAi && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Для подбора с ИИ опишите задачу подробнее — хотя бы одним предложением. Ниже результаты обычного поиска.
        </p>
      )}

      {withAi && page === 1 && (
        <Suspense fallback={
          <div className="mb-8 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin text-violet-500" /> ИИ читает карточки и подбирает решения под задачу…
          </div>
        }>
          <TaskPicks task={query} />
        </Suspense>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-slate-800">{query ? 'Все результаты поиска' : 'Все решения витрины'}</h2>
        <span className="text-sm text-slate-500">{projects.length}</span>
        <span className="text-xs text-slate-400">— проекты с описанием и подтверждением: документом или демо</span>
      </div>

      {topics.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Link href={href({ topic: undefined })}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${!params.topic ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
            Все направления
          </Link>
          {topics.map(({ topic, count }) => (
            <Link key={topic} href={href({ topic })}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${params.topic === topic ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
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
    </div>
  )
}
