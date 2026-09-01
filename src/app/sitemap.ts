import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo'

/**
 * Портал закрыт логином: без входа доступны только главная с картой
 * и страница контактов. Остальные адреса поисковому роботу отдают
 * переадресацию на форму входа, поэтому в карту сайта они не попадают —
 * иначе мы обещаем поисковику страницы, которые он не может прочитать.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()

  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/contacts`, changeFrequency: 'yearly', priority: 0.5 },
  ]
}
