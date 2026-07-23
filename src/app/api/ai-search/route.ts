import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateMatchReasons, generateSearchSummary } from "@/lib/geminiSummary"

const requestCounts = new Map<string, { count: number; reset: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = requestCounts.get(ip)
  if (!entry || now > entry.reset) {
    requestCounts.set(ip, { count: 1, reset: now + 60_000 })
    return false
  }
  entry.count++
  return entry.count > 20
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Слишком много запросов, попробуйте через минуту" }, { status: 429 })
    }

    const body = await request.json()
    const query = typeof body.query === "string" ? body.query : ""

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Введите минимум 2 символа" }, { status: 400 })
    }

    const synonymMap: Array<{ pattern: RegExp; categories: string[] }> = [
      { pattern: /нефтегаз|нефть|газ|углеводор|энергетик|энергетическ/iu, categories: ["ANALYTICS"] },
      { pattern: /компьютерн(?:ое|ная)? зрени|зрение|медицин|здравоохран/iu, categories: ["COMPUTER_VISION"] },
      { pattern: /чат-?бот|чатбот|чатботы|образован|школ|университ|курс|студент|экзамен|тест|проверк/iu, categories: ["EDUCATION", "GENERATIVE_AI"] },
      { pattern: /машинн(?:ое|ые)? обучен|machine learning|ml|анализ данных|data science|наук|исследовани/iu, categories: ["SCIENCE", "ANALYTICS"] },
      { pattern: /генеративн|llm|gpt|chatgpt|claude|gemini|генеративный/iu, categories: ["GENERATIVE_AI"] },
      { pattern: /робототех|робот|автоматизац(?:ия|ион)|промышленн(?:ая|ые) автоматизац/iu, categories: ["ROBOTICS"] },
      { pattern: /управлени|менеджмент|management|организац/iu, categories: ["MANAGEMENT"] },
      { pattern: /наука|исследовани|исследовател/iu, categories: ["SCIENCE"] },
    ]

    const triggers = new Set<string>()
    const qLower = query.toLowerCase()
    for (const m of synonymMap) if (m.pattern.test(qLower)) for (const c of m.categories) triggers.add(c)

    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))

    const searchPromise = (async () => {
      const search = query.trim()
      if (search.length === 0) return []

      let mainRows: Array<{ id: string; rank: number }> = []
      try {
        const ftsPromise = prisma.$queryRaw<Array<{ id: string; rank: number }>>`
          SELECT p.id, ts_rank(p.search_vector, websearch_to_tsquery('russian', ${search})) AS rank
          FROM projects p
          WHERE p.search_vector @@ websearch_to_tsquery('russian', ${search})
          ORDER BY rank DESC
          LIMIT 50
        `
        mainRows = await Promise.race([ftsPromise, timeoutPromise]) as Array<{id:string,rank:number}>
      } catch (e) {
        console.error('FTS query error', e)
        mainRows = []
      }

      let mainIds = mainRows.map(r => r.id)

      if (mainIds.length === 0) {
        try {
          const simRows = await Promise.race([
            prisma.$queryRaw<Array<{ id: string; sim: number }>>`
              SELECT id, similarity(title, ${search}) AS sim
              FROM projects
              WHERE similarity(title, ${search}) > 0.25
              ORDER BY sim DESC
              LIMIT 50
            `,
            timeoutPromise,
          ]) as Array<{id:string,sim:number}>
          mainIds = simRows.map(r => r.id)
        } catch (e) {
          console.error('Similarity fallback error', e)
          mainIds = []
        }
      }

      let catIds: string[] = []
      if (triggers.size > 0) {
        const cats = Array.from(triggers)
        try {
          const rows = await prisma.project.findMany({ where: { category: { in: cats as any } }, select: { id: true }, take: 50 })
          catIds = rows.map(r => r.id)
        } catch (e) {
          console.error('Category lookup error', e)
          catIds = []
        }
      }

      const combined = Array.from(new Set([...mainIds, ...catIds])).slice(0,50)
      if (combined.length === 0) return []

      const projects = await prisma.project.findMany({ where: { id: { in: combined } }, include: { technologies: true, university: { include: { region: true } } } })
      const projectsById = new Map(projects.map((p) => [p.id, p]))
      const ordered = combined.map((id) => projectsById.get(id)).filter(Boolean)
      return ordered
    })()

    const projects = (await Promise.race([searchPromise, timeoutPromise])) as any[]
    const aiSummary = await generateSearchSummary(query, projects.map((project) => ({
      title: project.title,
      description: project.description ?? null,
    })))
    const matchReasons = await generateMatchReasons(query, projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description ?? null,
    })))

    return NextResponse.json({ query, count: projects.length, results: projects, aiSummary, matchReasons })
  } catch (error) {
    console.error(error)
    if (error instanceof Error && error.message === "timeout") return NextResponse.json({ error: "Поиск занял слишком много времени, попробуйте уточнить запрос" }, { status: 503 })
    return NextResponse.json({ error: "Ошибка поиска" }, { status: 500 })
  }
}
