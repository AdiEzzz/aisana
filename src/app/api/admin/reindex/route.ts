import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { invalidateSearchIndex, reindexAllProjects } from '@/lib/search/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Полная переиндексация: пересчитывает тематические направления всех проектов
 * и сбрасывает кэш поискового индекса.
 *
 * Запускать после правки справочника направлений (src/lib/search/taxonomy.ts)
 * или после массового импорта проектов.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireApiRole(request, [UserRole.ADMIN, UserRole.EDITOR])
    if (response) return response

    const result = await reindexAllProjects(prisma)
    invalidateSearchIndex()

    await audit(user, 'UPDATE', 'search_index', null,
      `переиндексация: ${result.projects} проектов, ${result.topics} направлений`)

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('Reindex error:', error)
    return NextResponse.json({ error: 'Ошибка переиндексации' }, { status: 500 })
  }
}
