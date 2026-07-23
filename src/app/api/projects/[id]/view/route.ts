import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientIp, isFirstInWindow, rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ip = getClientIp(request)

    // Общий предохранитель: не более 60 запросов к счётчику с одного IP в минуту
    if (!rateLimit(`view:rl:${ip}`, 60, 60 * 1000).ok) {
      return NextResponse.json({ ok: false })
    }

    // Серверная дедупликация: один IP засчитывается для проекта
    // не чаще одного раза в час (sessionStorage на клиенте — лишь UX-слой,
    // накрутка через curl теперь не работает).
    if (!isFirstInWindow(`view:${ip}:${id}`, 60 * 60 * 1000)) {
      return NextResponse.json({ ok: true, counted: false })
    }

    await prisma.project.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })
    return NextResponse.json({ ok: true, counted: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
