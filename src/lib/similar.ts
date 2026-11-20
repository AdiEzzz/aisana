import type { IndexedProject } from '@/lib/search/engine'
import type { TopicId } from '@/lib/search/taxonomy'
import { DESCRIPTION_PLACEHOLDER, MIN_DESCRIPTION_LENGTH } from '@/lib/project-completeness'

/**
 * Похожие проекты на портале.
 *
 * Сходство считается без модели, по поисковому индексу: общие редкие слова
 * в названии, тегах и описании, с надбавкой за общие узкие направления.
 * Так вуз видит, кто уже делал похожее, а результат одинаков при каждом
 * открытии страницы и не тратит квоту ИИ.
 */

/** Ниже этого порога проект похожим не считаем. */
export const MIN_SIMILARITY = 0.2

/** Меньше общих редких слов — сходство случайное. */
const MIN_SHARED_WORDS = 2

/** С этого числа слов карточка считается подробной. */
const LONG_CARD_WORDS = 12

/** Надбавка за полное совпадение узких направлений: до +50% к сходству по словам. */
const TOPIC_BONUS = 0.5

/** Слово встречается чаще, чем в этой доле проектов, — оно ничего не различает. */
const COMMON_WORD_SHARE = 0.2

/** Направление есть больше чем у этой доли проектов — оно ничего не различает. */
const BROAD_TOPIC_SHARE = 0.3

/** Длина основы: «библиотека», «библиотеки» и «библиотекарь» дают одну основу. */
const STEM_LENGTH = 6

const PLACEHOLDER = DESCRIPTION_PLACEHOLDER.toLowerCase()

export interface SimilarProject {
  id: string
  /** Сходство 0–100 */
  score: number
  /** Общие узкие направления, от самого сильного */
  sharedTopics: { topic: TopicId; label: string }[]
  /** Общие редкие слова — для подписи «почему похож» */
  sharedWords: string[]
}

const stem = (word: string) => word.slice(0, STEM_LENGTH)

/**
 * Основы слов проекта, пригодные для сравнения, и слово, из которого
 * получена каждая основа (для показа).
 *
 * Описание-заглушку («Описание не указано», «Запущен.») не учитываем:
 * иначе все пустые карточки оказались бы похожи друг на друга.
 */
function contentWords(project: IndexedProject, skip: Set<string>): Map<string, string> {
  const words = new Map<string, string>()
  const add = (tokens: string[]) => {
    for (const token of tokens) {
      if (token.length < 4 || /^\d+$/.test(token)) continue
      const key = stem(token)
      if (skip.has(key) || words.has(key)) continue
      words.set(key, token)
    }
  }

  add(project.fields.title?.tokens ?? [])
  add(project.fields.tags?.tokens ?? [])
  add(project.fields.technologies?.tokens ?? [])

  const description = project.fields.description
  const text = description?.text ?? ''
  if (text.length >= MIN_DESCRIPTION_LENGTH && !text.startsWith(PLACEHOLDER)) add(description.tokens)

  return words
}

/**
 * Находит проекты, похожие на заданный.
 *
 * Возвращает пустой список, если проекта нет в индексе (например, он только
 * что опубликован и кэш индекса ещё не обновился).
 */
export function findSimilar(index: IndexedProject[], projectId: string, limit = 5): SimilarProject[] {
  const targetAt = index.findIndex(project => project.id === projectId)
  if (targetAt === -1) return []

  // Название и сокращение вуза часто стоят в названии проекта («KazNU Прокторинг»).
  // По ним похожими оказались бы все проекты одного вуза, поэтому их пропускаем.
  const skip = new Set<string>()
  for (const project of index) {
    for (const token of project.universityShort) skip.add(stem(token))
    for (const token of project.fields.university?.tokens ?? []) skip.add(stem(token))
  }

  const wordSets = index.map(project => contentWords(project, skip))
  const total = index.length

  const frequency = new Map<string, number>()
  for (const words of wordSets) {
    for (const word of words.keys()) frequency.set(word, (frequency.get(word) ?? 0) + 1)
  }
  const commonLimit = Math.max(3, total * COMMON_WORD_SHARE)

  /** Редкое слово весит больше частого; слишком частые не учитываются. */
  const weight = (word: string): number => {
    const count = frequency.get(word) ?? 1
    if (count > commonLimit) return 0
    return Math.log(1 + total / count)
  }

  const target = index[targetAt]
  const targetWords = wordSets[targetAt]
  let targetWordWeight = 0
  for (const word of targetWords.keys()) targetWordWeight += weight(word)
  if (targetWordWeight === 0) return []

  // Широкие направления не учитываем: они есть у трети портала
  const topicCount = new Map<TopicId, number>()
  for (const project of index) {
    for (const topic of project.topicScore.keys()) topicCount.set(topic, (topicCount.get(topic) ?? 0) + 1)
  }
  const broadLimit = Math.max(3, total * BROAD_TOPIC_SHARE)
  const narrowTopics = target.topics.filter(match => (topicCount.get(match.topic) ?? 0) <= broadLimit)
  let targetTopicWeight = 0
  for (const match of narrowTopics) targetTopicWeight += match.score

  const result: SimilarProject[] = []

  index.forEach((candidate, at) => {
    if (at === targetAt) return

    // Сходство по словам: какая доля редких слов цели есть у кандидата
    let sharedWordWeight = 0
    const sharedWords: { word: string; weight: number }[] = []
    for (const [key, word] of targetWords) {
      if (!wordSets[at].has(key)) continue
      const w = weight(key)
      if (w === 0) continue
      sharedWordWeight += w
      sharedWords.push({ word, weight: w })
    }
    // Одного общего слова мало: в похожие попадали бы случайные проекты
    // (у подробной карточки — трёх: общих слов вроде «полный» и «цикл» там много)
    if (sharedWords.length < (targetWords.size >= LONG_CARD_WORDS ? MIN_SHARED_WORDS + 1 : MIN_SHARED_WORDS)) return
    const lexical = sharedWordWeight / targetWordWeight

    // Общие узкие направления усиливают сходство, но сами его не создают
    let sharedTopicWeight = 0
    const sharedTopics: { topic: TopicId; label: string; strength: number }[] = []
    for (const match of narrowTopics) {
      const other = candidate.topicScore.get(match.topic)
      if (!other) continue
      const strength = Math.min(match.score, other)
      sharedTopicWeight += strength
      sharedTopics.push({ topic: match.topic, label: match.label, strength })
    }
    const topical = targetTopicWeight > 0 ? sharedTopicWeight / targetTopicWeight : 0

    const similarity = Math.min(1, lexical * (1 + TOPIC_BONUS * topical))
    if (similarity < MIN_SIMILARITY) return

    result.push({
      id: candidate.id,
      score: Math.round(similarity * 100),
      sharedTopics: sharedTopics
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 3)
        .map(({ topic, label }) => ({ topic, label })),
      sharedWords: sharedWords
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
        .map(item => item.word),
    })
  })

  // Второй ключ — id: порядок среди равных не должен зависеть от порядка индекса
  return result
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit)
}
