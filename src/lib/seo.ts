/** Базовый URL сайта для метаданных, sitemap и OpenGraph.
 *  В проде задаётся через NEXT_PUBLIC_APP_URL в .env (домен портала). */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
}

export const SITE_NAME = 'AiSana — карта ИИ-решений ВУЗов Казахстана'

/** Обрезка описания до нормальной длины сниппета. */
export function metaDescription(text: string | null | undefined, fallback: string): string {
  const source = (text || '').replace(/\s+/g, ' ').trim()
  if (!source) return fallback
  return source.length > 160 ? `${source.slice(0, 157)}…` : source
}
