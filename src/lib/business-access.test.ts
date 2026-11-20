import { describe, expect, it } from 'vitest'
import { conversationSide, conversationsWhere, isUnread } from '@/lib/business-access'

const conversation = { businessUserId: 'partner1', universityId: 'uni1' }

const partner = { id: 'partner1', role: 'BUSINESS' as const }
const otherPartner = { id: 'partner2', role: 'BUSINESS' as const }
const rep = { id: 'rep1', role: 'UNIVERSITY_REP' as const, universityId: 'uni1' }
const otherRep = { id: 'rep2', role: 'UNIVERSITY_REP' as const, universityId: 'uni2' }
const repWithoutUniversity = { id: 'rep3', role: 'UNIVERSITY_REP' as const, universityId: null }
const admin = { id: 'admin1', role: 'ADMIN' as const }
const editor = { id: 'editor1', role: 'EDITOR' as const }
const viewer = { id: 'viewer1', role: 'VIEWER' as const, universityId: 'uni1' }

describe('доступ к диалогу', () => {
  it('партнёр видит только свой диалог', () => {
    expect(conversationSide(partner, conversation)).toBe('business')
    expect(conversationSide(otherPartner, conversation)).toBeNull()
  })

  it('представитель вуза видит только диалоги своего вуза', () => {
    expect(conversationSide(rep, conversation)).toBe('university')
    expect(conversationSide(otherRep, conversation)).toBeNull()
    expect(conversationSide(repWithoutUniversity, conversation)).toBeNull()
  })

  it('модератор читает, но стороной не становится', () => {
    expect(conversationSide(admin, conversation)).toBe('moderator')
    expect(conversationSide(editor, conversation)).toBe('moderator')
  })

  it('роль «просмотр» доступа не получает, даже с привязанным вузом', () => {
    expect(conversationSide(viewer, conversation)).toBeNull()
  })

  it('партнёр не получает доступ через совпадение id с вузом', () => {
    expect(conversationSide({ id: 'uni1', role: 'BUSINESS' }, conversation)).toBeNull()
  })
})

describe('выборка диалогов', () => {
  it('ограничивает партнёра его диалогами', () => {
    expect(conversationsWhere(partner)).toEqual({ businessUserId: 'partner1' })
  })

  it('ограничивает представителя его вузом', () => {
    expect(conversationsWhere(rep)).toEqual({ universityId: 'uni1' })
  })

  it('представителю без вуза и роли «просмотр» не отдаёт ничего', () => {
    expect(conversationsWhere(repWithoutUniversity)).toEqual({ universityId: '__none__' })
    expect(conversationsWhere(viewer)).toEqual({ id: '__none__' })
  })

  it('модератору отдаёт все', () => {
    expect(conversationsWhere(admin)).toEqual({})
  })
})

describe('непрочитанное', () => {
  const at = (minute: number) => new Date(2026, 10, 20, 12, minute)

  it('новое сообщение после прочтения — непрочитанное', () => {
    expect(isUnread('business', { lastMessageAt: at(10), businessReadAt: at(5), universityReadAt: null })).toBe(true)
  })

  it('прочитанное позже последнего сообщения — прочитано', () => {
    expect(isUnread('university', { lastMessageAt: at(10), businessReadAt: null, universityReadAt: at(11) })).toBe(false)
  })

  it('у модератора непрочитанных нет', () => {
    expect(isUnread('moderator', { lastMessageAt: at(10), businessReadAt: null, universityReadAt: null })).toBe(false)
  })
})
