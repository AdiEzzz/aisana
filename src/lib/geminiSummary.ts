import { GoogleGenerativeAI } from '@google/generative-ai'

interface ProjectSummaryInput {
  title: string
  description: string | null
}

export async function generateSearchSummary(query: string, projects: ProjectSummaryInput[]): Promise<string> {
  if (projects.length === 0) return ''

  const topProjects = projects.slice(0, 10)
  const projectList = topProjects
    .map((project) => `- ${project.title}${project.description ? `: ${project.description}` : ''}`)
    .join('\n')

  const prompt = `Пользователь искал: '${query}'. Вот найденные проекты ИИ-решений в казахстанских вузах:\n${projectList}\n\nНапиши краткое резюме (2-3 предложения на русском), обобщающее какие типы решений нашлись и в каких областях.`

  if (!process.env.GEMINI_API_KEY) return ''

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text().trim()
  } catch (error) {
    console.error('Failed to generate AI search summary', error)
    return ''
  }
}

export async function generateMatchReasons(
  query: string,
  projects: Array<{ id: string; title: string; description: string | null }>,
): Promise<Record<string, string>> {
  if (projects.length === 0) return {}

  const topProjects = projects.slice(0, 5)
  const projectList = topProjects
    .map((project) => `id: ${project.id}, title: ${project.title}, description: ${project.description ?? 'Нет описания'}`)
    .join('\n')

  const prompt = `Пользователь искал: '${query}'. Вот топ-5 найденных проектов с их id, названием и описанием:\n${projectList}\n\nДля КАЖДОГО проекта напиши одно короткое предложение (не длиннее 15 слов) объясняющее, почему именно этот проект соответствует запросу пользователя. Верни ТОЛЬКО валидный JSON-объект без markdown-обёртки, где ключ — это id проекта, а значение — это объяснение. Пример формата: {"id1": "Подходит, потому что...", "id2": "Соответствует запросу, так как..."}`

  if (!process.env.GEMINI_API_KEY) return {}

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
    const result = await model.generateContent(prompt)
    const response = await result.response
    const rawText = response.text().trim()
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()

    const parsed = JSON.parse(cleaned) as Record<string, string>
    return parsed
  } catch (error) {
    console.error('Failed to generate AI match reasons', error)
    return {}
  }
}
