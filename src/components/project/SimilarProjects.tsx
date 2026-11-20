import Link from 'next/link'
import { GitCompareArrows } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { PUBLISHED_ONLY } from '@/lib/publication'
import { loadSearchIndex } from '@/lib/search/store'
import { findSimilar } from '@/lib/similar'
import { StatusBadge } from '@/components/ui/status-badge'

/**
 * Похожие проекты других команд на портале.
 *
 * Считается по поисковому индексу без обращения к ИИ: общие направления и
 * общие редкие слова. Помогает увидеть, кто уже решал ту же задачу.
 */
export async function SimilarProjects({ projectId }: { projectId: string }) {
  const similar = findSimilar(await loadSearchIndex(), projectId, 5)
  if (similar.length === 0) return null

  const projects = await prisma.project.findMany({
    where: { id: { in: similar.map(item => item.id) }, ...PUBLISHED_ONLY },
    select: {
      id: true,
      title: true,
      status: true,
      university: { select: { name: true, shortName: true } },
    },
  })
  const byId = new Map(projects.map(project => [project.id, project]))
  const rows = similar.filter(item => byId.has(item.id))
  if (rows.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <GitCompareArrows size={16} className="text-slate-400" />
        <h2 className="font-semibold text-slate-700">Похожие проекты на портале</h2>
        <span className="text-xs text-slate-400">подобраны автоматически</span>
      </div>

      <div className="space-y-3">
        {rows.map(item => {
          const project = byId.get(item.id)!
          const why = item.sharedTopics.length
            ? item.sharedTopics.map(topic => topic.label).join(', ')
            : item.sharedWords.join(', ')
          return (
            <Link
              key={item.id}
              href={`/projects/${item.id}`}
              className="block rounded-lg border border-slate-100 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/40"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">{project.title}</p>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">{item.score}%</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={project.status} />
                <span className="text-xs text-slate-500">
                  {project.university.shortName || project.university.name}
                </span>
              </div>
              {why && <p className="mt-1.5 text-xs text-slate-400">Общее: {why}</p>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
