import { UserRole, type ProjectStatus } from '@prisma/client'
import { canModerate } from '@/lib/publication'

/**
 * Правила доступа кабинета партнёра: кто участник диалога и какие диалоги
 * видит пользователь. Без обращений к базе — чтобы правила можно было
 * проверить тестами.
 */

export type Actor = { id: string; role: UserRole; universityId?: string | null }

export const isBusiness = (user: { role: UserRole }) => user.role === UserRole.BUSINESS

/** Стадии, на которых решение можно показывать бизнесу как готовое к внедрению. */
export const READY_STATUSES: ProjectStatus[] = ['PILOT', 'IMPLEMENTED', 'SCALED']

/** Сторона участника в диалоге; null — доступа нет. */
export function conversationSide(
  user: Actor,
  conversation: { businessUserId: string; universityId: string },
): 'business' | 'university' | 'moderator' | null {
  if (user.role === UserRole.BUSINESS) return conversation.businessUserId === user.id ? 'business' : null
  if (user.role === UserRole.UNIVERSITY_REP) {
    return user.universityId && user.universityId === conversation.universityId ? 'university' : null
  }
  // Модератор читает диалоги, но не пишет в них от имени сторон
  return canModerate(user) ? 'moderator' : null
}

/** Условие выборки диалогов, доступных пользователю. */
export function conversationsWhere(user: Actor) {
  if (user.role === UserRole.BUSINESS) return { businessUserId: user.id }
  if (user.role === UserRole.UNIVERSITY_REP) return { universityId: user.universityId || '__none__' }
  if (canModerate(user)) return {}
  return { id: '__none__' }
}

/** Есть ли в диалоге непрочитанное для этой стороны. */
export function isUnread(
  side: 'business' | 'university' | 'moderator',
  conversation: { lastMessageAt: Date; businessReadAt: Date | null; universityReadAt: Date | null; lastFromBusiness?: boolean },
): boolean {
  if (side === 'moderator') return false
  const readAt = side === 'business' ? conversation.businessReadAt : conversation.universityReadAt
  return !readAt || readAt.getTime() < conversation.lastMessageAt.getTime()
}
