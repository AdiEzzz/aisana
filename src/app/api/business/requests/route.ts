import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { businessRequestSchema, parseBody } from '@/lib/schemas'

/** Новый запрос бизнеса: задача, под которую он ищет решение у вузов. */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireApiRole(request, [UserRole.BUSINESS])
    if (response) return response

    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(businessRequestSchema, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    if (!rateLimit(`business-request:${user.id}`, 10, 24 * 60 * 60 * 1000).ok) {
      return NextResponse.json({ error: 'Слишком много задач за сутки. Попробуйте завтра.' }, { status: 429 })
    }

    const created = await prisma.businessRequest.create({
      data: {
        authorId: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        industry: parsed.data.industry ?? null,
        expectation: parsed.data.expectation,
      },
      select: { id: true },
    })

    await audit(user, 'CREATE', 'business_request', created.id, parsed.data.title)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Business request create error:', error)
    return NextResponse.json({ error: 'Не удалось сохранить задачу' }, { status: 500 })
  }
}
