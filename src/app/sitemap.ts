import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { cached } from '@/lib/data-cache'
import { getSiteUrl } from '@/lib/seo'

// Генерируется на запрос (при сборке образа БД недоступна),
// данные кэшируются на час
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()

  const { projects, universities, regions } = await cached('sitemap', 60 * 60 * 1000, async () => {
    const [projects, universities, regions] = await Promise.all([
      prisma.project.findMany({ select: { id: true, updatedAt: true } }),
      prisma.university.findMany({ select: { id: true, updatedAt: true } }),
      prisma.region.findMany({ select: { code: true, updatedAt: true } }),
    ])
    return { projects, universities, regions }
  })

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/dashboard`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/projects`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/universities`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/ai-search`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  return [
    ...staticPages,
    ...projects.map(p => ({
      url: `${base}/projects/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...universities.map(u => ({
      url: `${base}/universities/${u.id}`,
      lastModified: u.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...regions.map(r => ({
      url: `${base}/regions/${r.code}`,
      lastModified: r.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}
