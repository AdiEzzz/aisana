/**
 * Автоматическая тематическая классификация проектов.
 *
 * Проект относится сразу ко всем направлениям, признаки которых нашлись
 * в его тексте. Для каждого направления считается коэффициент релевантности
 * 0–100 и собирается объяснение: какие слова и в каком поле сработали.
 *
 * Классификация детерминированная — одинаковый текст всегда даёт одинаковый
 * результат, и всегда видно, почему проект попал в направление.
 */

import {
  CATEGORY_TO_TOPICS, SIGNAL_WEIGHT, TECH_SLUG_TO_TOPICS, TOPICS,
  type SignalLevel, type Topic, type TopicId,
} from './taxonomy'
import { hasSignal, normalize, tokenize } from './text'

/** Поля проекта, по которым идёт классификация, и их значимость. */
const FIELD_WEIGHTS = {
  title: 3,
  tags: 2.5,
  technologies: 2,
  description: 1.4,
  impact: 1,
  results: 1,
} as const

export type ClassifiableField = keyof typeof FIELD_WEIGHTS

const FIELD_LABELS: Record<ClassifiableField, string> = {
  title: 'названии',
  tags: 'тегах',
  technologies: 'технологиях',
  description: 'описании',
  impact: 'разделе «Влияние»',
  results: 'результатах',
}

export interface ClassifiableProject {
  title?: string | null
  description?: string | null
  impact?: string | null
  results?: string | null
  tags?: string[] | null
  category?: string | null
  technologies?: { name: string; slug?: string | null }[] | null
}

export interface TopicMatch {
  topic: TopicId
  label: string
  /** Коэффициент релевантности 0–100 */
  score: number
  /** Сработавшие признаки: слово, уровень, поле */
  signals: { term: string; level: SignalLevel; field: ClassifiableField | 'category' | 'technologies' }[]
  explanation: string
}

/** Готовит поля проекта к разбору: нормализованный текст и слова по каждому полю. */
function prepareFields(project: ClassifiableProject) {
  const raw: Record<ClassifiableField, string> = {
    title: project.title ?? '',
    description: project.description ?? '',
    impact: project.impact ?? '',
    results: project.results ?? '',
    tags: (project.tags ?? []).join(' '),
    technologies: (project.technologies ?? []).map(t => t.name).join(' '),
  }

  const prepared = {} as Record<ClassifiableField, { text: string; tokens: string[] }>
  for (const field of Object.keys(raw) as ClassifiableField[]) {
    const text = normalize(raw[field])
    prepared[field] = { text, tokens: tokenize(text) }
  }
  return prepared
}

function collectSignals(topic: Topic): { term: string; level: SignalLevel }[] {
  return [
    ...topic.strong.map(term => ({ term, level: 'strong' as const })),
    ...topic.medium.map(term => ({ term, level: 'medium' as const })),
    ...topic.weak.map(term => ({ term, level: 'weak' as const })),
  ]
}

/** Насыщающая кривая: первые совпадения дают много, дальше прирост замедляется. */
function toScore(rawWeight: number): number {
  if (rawWeight <= 0) return 0
  return Math.min(100, Math.round(100 * (1 - Math.exp(-rawWeight / 12))))
}

function buildExplanation(topic: Topic, match: TopicMatch['signals']): string {
  const byField = new Map<string, string[]>()
  for (const signal of match.slice(0, 8)) {
    const label =
      signal.field === 'category' ? 'выбранной категории'
      : signal.field === 'technologies' ? 'технологиях'
      : FIELD_LABELS[signal.field]
    const list = byField.get(label) ?? []
    if (!list.includes(signal.term)) list.push(signal.term)
    byField.set(label, list)
  }

  const parts = [...byField.entries()].map(
    ([field, terms]) => `в ${field} — ${terms.map(t => `«${t}»`).join(', ')}`
  )

  return `Отнесён к направлению «${topic.label}»: ${parts.join('; ')}.`
}

/**
 * Классифицирует проект по всем направлениям сразу.
 * Возвращает только направления с уверенным совпадением, по убыванию релевантности.
 */
export function classifyProject(project: ClassifiableProject): TopicMatch[] {
  const fields = prepareFields(project)
  const categoryTopics = new Set(CATEGORY_TO_TOPICS[String(project.category ?? '')] ?? [])

  const techTopics = new Map<TopicId, string[]>()
  for (const tech of project.technologies ?? []) {
    for (const topicId of TECH_SLUG_TO_TOPICS[String(tech.slug ?? '')] ?? []) {
      const list = techTopics.get(topicId) ?? []
      list.push(tech.name)
      techTopics.set(topicId, list)
    }
  }

  const results: TopicMatch[] = []

  for (const topic of TOPICS) {
    const signals: TopicMatch['signals'] = []
    let raw = 0
    let hasConfident = false

    for (const { term, level } of collectSignals(topic)) {
      for (const field of Object.keys(FIELD_WEIGHTS) as ClassifiableField[]) {
        const { text, tokens } = fields[field]
        if (!text) continue
        if (!hasSignal(text, tokens, term)) continue

        raw += SIGNAL_WEIGHT[level] * FIELD_WEIGHTS[field]
        signals.push({ term, level, field })
        if (level !== 'weak') hasConfident = true
        break // один признак засчитываем один раз — по самому весомому полю
      }
    }

    // Короткие точные обозначения: «гмк», «hr», «iot» — только полным словом
    for (const alias of topic.aliases ?? []) {
      for (const field of Object.keys(FIELD_WEIGHTS) as ClassifiableField[]) {
        if (fields[field].tokens.includes(alias)) {
          raw += SIGNAL_WEIGHT.strong * FIELD_WEIGHTS[field]
          signals.push({ term: alias, level: 'strong', field })
          hasConfident = true
          break
        }
      }
    }

    // Категория, выбранная человеком при заполнении, — надёжный сигнал
    if (categoryTopics.has(topic.id)) {
      raw += 10
      signals.push({ term: 'категория проекта', level: 'strong', field: 'category' })
      hasConfident = true
    }

    // Справочник технологий проекта
    const techNames = techTopics.get(topic.id)
    if (techNames?.length) {
      raw += 6
      signals.push({ term: techNames.join(', '), level: 'strong', field: 'technologies' })
      hasConfident = true
    }

    if (!hasConfident || raw < 4) continue

    const score = toScore(raw)
    if (score < 25) continue

    const ordered = signals.sort(
      (a, b) => SIGNAL_WEIGHT[b.level] - SIGNAL_WEIGHT[a.level]
    )

    results.push({
      topic: topic.id,
      label: topic.label,
      score,
      signals: ordered,
      explanation: buildExplanation(topic, ordered),
    })
  }

  return results.sort((a, b) => b.score - a.score)
}
