/**
 * Разбор поискового запроса.
 *
 * Задача — понять, ЧТО человек ищет, а не только какие буквы он набрал.
 * Запросы «заводы», «производство», «manufacturing», «Industry 4.0» должны
 * приводить к одному и тому же направлению, поэтому запрос сопоставляется
 * с тем же справочником признаков, что и проекты.
 */

import { TOPICS, type TopicId } from './taxonomy'
import { hasQuerySignal, normalize, tokenize } from './text'

export interface ParsedQuery {
  /** Исходный запрос */
  raw: string
  /** Нормализованный текст */
  text: string
  /** Значимые слова запроса */
  tokens: string[]
  /** Направления, которые имел в виду пользователь, с силой намерения 0–1 */
  topics: { topic: TopicId; label: string; weight: number; matched: string[] }[]
  /** Слова для лексического поиска: запрос + расширение по направлениям */
  expanded: string[]
}

/**
 * Насколько уверенно запрос указывает на направление.
 * Точное совпадение с названием направления или сильным признаком — максимум.
 */
function topicIntent(text: string, tokens: string[]) {
  const found: ParsedQuery['topics'] = []

  for (const topic of TOPICS) {
    const matched: string[] = []
    let weight = 0

    // Название направления целиком («промышленность», «robotics», «гмк»)
    const labelTokens = tokenize(topic.label)
    const labelEnTokens = tokenize(topic.labelEn)
    const labelHit =
      labelTokens.some(word => tokens.includes(word) && word.length > 3) ||
      labelEnTokens.some(word => tokens.includes(word) && word.length > 3)
    if (labelHit) {
      weight += 1
      matched.push(topic.label.toLowerCase())
    }

    for (const alias of topic.aliases ?? []) {
      if (tokens.includes(alias)) {
        weight += 1
        matched.push(alias)
      }
    }

    for (const term of topic.strong) {
      if (hasQuerySignal(text, tokens, term)) {
        weight += 0.9
        matched.push(term)
      }
    }
    for (const term of topic.medium) {
      if (hasQuerySignal(text, tokens, term)) {
        weight += 0.5
        matched.push(term)
      }
    }
    // Слабые признаки в запросе не учитываем: запрос короткий,
    // и одно контекстное слово не должно тянуть за собой целую отрасль.

    if (weight <= 0) continue
    found.push({
      topic: topic.id,
      label: topic.label,
      weight: Math.min(1, weight),
      matched: [...new Set(matched)].slice(0, 6),
    })
  }

  return found.sort((a, b) => b.weight - a.weight)
}

export function parseQuery(raw: string): ParsedQuery {
  const text = normalize(raw)
  const tokens = tokenize(text)
  const topics = topicIntent(text, tokens)

  // Расширяем запрос сильными признаками найденных направлений: так проект
  // про «дефекты сварки» находится по запросу «производство», хотя дословного
  // совпадения в тексте нет.
  const expanded = new Set(tokens)
  for (const intent of topics.slice(0, 3)) {
    const topic = TOPICS.find(t => t.id === intent.topic)
    if (!topic) continue
    for (const term of [...topic.strong, ...topic.medium]) {
      if (!term.includes(' ')) expanded.add(term)
    }
  }

  return { raw, text, tokens, topics, expanded: [...expanded] }
}
