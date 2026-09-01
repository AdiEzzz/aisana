import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Кто сейчас вошёл — нужно шапке, чтобы показывать только доступные разделы.
 * Отдаёт минимум: роль и имя. Настоящая защита разделов — на страницах и в API,
 * это лишь подсказка интерфейсу.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request)
  if (!user) return NextResponse.json({ user: null })

  return NextResponse.json({
    user: { role: user.role, name: user.name, email: user.email },
  })
}
