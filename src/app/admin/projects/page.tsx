export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ExternalLink, Pencil, Plus } from 'lucide-react'
import { Prisma, ProjectStatus, PublicationStatus, UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { canModerate } from '@/lib/publication'
import { PublicationBadge, PublicationControl } from '@/components/admin/PublicationControl'
import { STATUS_LABELS } from '@/types'
import { DeleteProjectButton } from '../universities/DeleteButton'
import { ListFilters } from '@/components/admin/ListFilters'
import { Pagination } from '@/components/admin/Pagination'

const PAGE_SIZE = 25

const STATUS_COLORS: Record<ProjectStatus, string> = {
  IDEA: 'bg-slate-100 text-slate-600',
  PROTOTYPE: 'bg-amber-100 text-amber-700',
  PILOT: 'bg-blue-100 text-blue-700',
  IMPLEMENTED: 'bg-emerald-100 text-emerald-700',
  SCALED: 'bg-violet-100 text-violet-700',
}

const SORTS: Record<string, Prisma.ProjectOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  title: { title: 'asc' },
}

interface SearchParams {
  q?: string
  universityId?: string
  regionId?: string
  status?: string
  publication?: string
  sort?: string
  page?: string
}

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireRole([UserRole.ADMIN, UserRole.EDITOR, UserRole.UNIVERSITY_REP], '/admin/projects')
  const params = await searchParams

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const isRep = user.role === UserRole.UNIVERSITY_REP

  // ── where из фильтров ──────────────────────────────────────
  const where: Prisma.ProjectWhereInput = {
    // UNIVERSITY_REP всегда видит только свой вуз, фильтры это не обходят
    ...(isRep ? { universityId: user.universityId || '__none__' } : {}),
    ...(!isRep && params.universityId ? { universityId: params.universityId } : {}),
    ...(params.regionId ? { university: { regionId: params.regionId } } : {}),
    ...(params.status && params.status in STATUS_LABELS ? { status: params.status as ProjectStatus } : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: 'insensitive' } },
            { description: { contains: params.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  // Фильтр по статусу публикации: удобно открыть очередь «На проверке»
  if (params.publication && params.publication in PublicationStatus) {
    where.publication = params.publication as PublicationStatus
  }

  const orderBy = SORTS[params.sort || 'newest'] || SORTS.newest

  const [projects, total, universities, regions] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        university: { select: { name: true, shortName: true } },
        technologies: { select: { name: true } },
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.project.count({ where }),
    isRep
      ? Promise.resolve([])
      : prisma.university.findMany({ select: { id: true, name: true, shortName: true }, orderBy: { name: 'asc' } }),
    prisma.region.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const filters = [
    ...(!isRep
      ? [{
          name: 'universityId',
          label: 'Все вузы',
          options: universities.map(u => ({ value: u.id, label: u.shortName || u.name })),
        }]
      : []),
    {
      name: 'regionId',
      label: 'Все регионы',
      options: regions.map(r => ({ value: r.id, label: r.name })),
    },
    {
      name: 'status',
      label: 'Все статусы',
      options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      name: 'publication',
      label: 'Все публикации',
      options: [
        { value: 'REVIEW', label: 'На проверке' },
        { value: 'DRAFT', label: 'Черновики' },
        { value: 'PUBLISHED', label: 'Опубликованные' },
      ],
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Проекты ({total})</h1>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Добавить проект
        </Link>
      </div>

      <ListFilters
        basePath="/admin/projects"
        values={params as Record<string, string | undefined>}
        filters={filters}
        searchPlaceholder="Поиск по названию…"
        sortOptions={[
          { value: 'newest', label: 'Сначала новые' },
          { value: 'oldest', label: 'Сначала старые' },
          { value: 'title', label: 'По названию А-Я' },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Проект</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Вуз</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Публикация</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map(project => (
              <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800 line-clamp-1">{project.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {project.technologies.map(t => t.name).join(', ') || '-'}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {project.university.shortName || project.university.name}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                    {STATUS_LABELS[project.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1.5">
                    <PublicationBadge publication={project.publication} />
                    <PublicationControl
                      projectId={project.id}
                      publication={project.publication}
                      canModerate={canModerate(user)}
                      compact
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/projects/${project.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Открыть на сайте"
                      className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <Link
                      href={`/admin/projects/${project.id}/edit`}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Pencil size={12} /> Изменить
                    </Link>
                    <DeleteProjectButton id={project.id} name={project.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            {total === 0 && !params.q && !params.universityId && !params.regionId && !params.status
              ? 'Нет проектов'
              : 'Ничего не найдено по заданным фильтрам'}
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        basePath="/admin/projects"
        searchParams={params as Record<string, string | undefined>}
      />
    </div>
  )
}
