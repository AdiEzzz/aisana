import { GoogleGenerativeAI } from '@google/generative-ai'

interface ProjectSummaryInput {
  title: string
  description: string | null
}

/** Модель можно переопределить через GEMINI_MODEL в .env, не трогая код. */
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash'

/** Сколько проектов максимум отправляем в модель за один запрос.
 *  Больше — выше риск, что ответ обрежется на середине и не распарсится. */
const BATCH_SIZE = 15

/** Максимум проектов, для которых генерируем подписи (защита от гигантских выдач). */
const MAX_PROJECTS = 60

function getModel() {
  if (!process.env.GEMINI_API_KEY) return null
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  return genAI.getGenerativeModel({ model: MODEL })
}

function shorten(text: string | null | undefined, limit: number): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return 'Нет описания'
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean
}

export async function generateSearchSummary(query: string, projects: ProjectSummaryInput[]): Promise<string> {
  if (projects.length === 0) return ''

  const model = getModel()
  if (!model) return ''

  const projectList = projects
    .slice(0, 10)
    .map(project => `- ${project.title}: ${shorten(project.description, 160)}`)
    .join('\n')

  const prompt = `Пользователь искал: "${query}".
Найденные ИИ-решения казахстанских вузов:
${projectList}

Напиши краткое резюме (2-3 предложения на русском): какие типы решений нашлись и чем они полезны в контексте запроса.
Если часть решений создавалась для другой отрасли — так и скажи, но укажи, что их можно адаптировать под задачу пользователя.
Пиши по делу, без вводных фраз вроде «По вашему запросу».`

  try {
    const result = await model.generateContent(prompt)
    return (await result.response).text().trim()
  } catch (error) {
    console.error('Failed to generate AI search summary', error)
    return ''
  }
}

/** Достаёт JSON-объект из ответа модели, даже если он обёрнут в ```json или обрезан. */
function extractJsonObject(raw: string): Record<string, string> {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>
  } catch {
    /* ответ обрезан или с лишним текстом — собираем пары вручную */
  }

  // Спасение обрезанного ответа: вытаскиваем все целые пары "ключ": "значение"
  const salvaged: Record<string, string> = {}
  const pairs = cleaned.matchAll(/"([^"\\]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)
  for (const [, key, value] of pairs) {
    salvaged[key] = value.replace(/\\"/g, '"').replace(/\\n/g, ' ').trim()
  }
  return salvaged
}

async function reasonsForBatch(
  model: NonNullable<ReturnType<typeof getModel>>,
  query: string,
  batch: Array<{ id: string; title: string; description: string | null }>,
): Promise<Record<string, string>> {
  const projectList = batch
    .map(project => `id: ${project.id} | ${project.title} | ${shorten(project.description, 200)}`)
    .join('\n')

  const prompt = `Пользователь искал: "${query}".
Список ИИ-решений казахстанских вузов:
${projectList}

Для КАЖДОГО решения из списка напиши одно короткое предложение (до 16 слов, на русском):
как это решение можно применить в контексте запроса пользователя — в каком сценарии и для какой задачи.
Пиши практично: «Можно применить для…», «Подойдёт, чтобы…».
Если решение создавалось для другой отрасли — не выдумывай ложное совпадение,
а честно укажи, что технологию можно адаптировать, и назови конкретный сценарий применения.
Не пропускай ни одного id.

Верни ТОЛЬКО JSON-объект без markdown: ключ — id решения, значение — предложение.`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  })

  return extractJsonObject((await result.response).text())
}

export async function generateMatchReasons(
  query: string,
  projects: Array<{ id: string; title: string; description: string | null }>,
): Promise<Record<string, string>> {
  if (projects.length === 0) return {}

  const model = getModel()
  if (!model) return {}

  // Подписи нужны для ВСЕХ найденных проектов, а не только для первых пяти,
  // поэтому режем список на батчи и обрабатываем их параллельно.
  const limited = projects.slice(0, MAX_PROJECTS)
  const batches: Array<typeof limited> = []
  for (let i = 0; i < limited.length; i += BATCH_SIZE) {
    batches.push(limited.slice(i, i + BATCH_SIZE))
  }

  const settled = await Promise.allSettled(batches.map(batch => reasonsForBatch(model, query, batch)))

  const reasons: Record<string, string> = {}
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      Object.assign(reasons, outcome.value)
    } else {
      console.error('Failed to generate AI match reasons for batch', outcome.reason)
    }
  }

  // Оставляем только id из выдачи: модель иногда придумывает лишние ключи
  const known = new Set(limited.map(project => project.id))
  for (const key of Object.keys(reasons)) {
    if (!known.has(key) || !String(reasons[key]).trim()) delete reasons[key]
  }

  return reasons
}
