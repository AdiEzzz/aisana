import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo'

/**
 * Открыты для индексации только главная и контакты — остальное
 * закрыто логином и роботу всё равно недоступно.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/$', '/contacts'],
      disallow: [
        '/admin',
        '/api/',
        '/login',
        '/projects',
        '/universities',
        '/regions',
        '/dashboard',
        '/hearings',
        '/best-practices',
        '/ai-search',
        '/uploads/',
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
