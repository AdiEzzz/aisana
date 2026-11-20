import { describe, expect, it } from 'vitest'
import { cardChecklist, hasDemo, hasDocuments, isConfirmed } from '@/lib/card-checklist'

const LONG = 'Чат-бот отвечает абитуриентам на вопросы о поступлении, грантах и документах круглосуточно на казахском и русском языках. '.repeat(2)

describe('подтверждение проекта', () => {
  it('пустая карточка не подтверждена и требует описание и подтверждения', () => {
    const items = cardChecklist({ description: 'Описание не указано' })
    expect(isConfirmed({ description: 'Описание не указано' })).toBe(false)
    expect(items.filter(item => item.level === 'required').map(item => item.key)).toEqual(['description', 'documents'])
  })

  it('описание без документов и демо не подтверждает проект', () => {
    expect(isConfirmed({ description: LONG })).toBe(false)
  })

  it('паспорт агента — документ', () => {
    const project = { description: LONG, agentPassportPdf: '/uploads/p.pdf' }
    expect(hasDocuments(project)).toBe(true)
    expect(isConfirmed(project)).toBe(true)
  })

  it('ссылка на продукт — демо, ссылка на Google Docs — документ', () => {
    expect(hasDemo({ files: [{ type: 'LINK', url: 'https://bot.example.kz' }] })).toBe(true)
    const doc = { files: [{ type: 'LINK', url: 'https://docs.google.com/presentation/d/1' }] }
    expect(hasDemo(doc)).toBe(false)
    expect(hasDocuments(doc)).toBe(true)
  })

  it('ссылка в тексте результатов считается демо', () => {
    expect(hasDemo({ results: 'Работает на https://bot.example.kz' })).toBe(true)
  })

  it('короткое описание — рекомендация, а не запрет', () => {
    const items = cardChecklist({ description: 'Чат-бот для абитуриентов вуза', agentPassportPdf: '/p.pdf' })
    expect(items.find(item => item.key === 'shortDescription')?.level).toBe('recommended')
  })

  it('стадия «Внедрено» требует места внедрения', () => {
    const items = cardChecklist({ description: LONG, status: 'IMPLEMENTED', agentPassportPdf: '/p.pdf' })
    expect(items.find(item => item.key === 'implementedAt')?.level).toBe('required')
  })

  it('полная карточка даёт пустой список', () => {
    expect(cardChecklist({
      description: LONG, impact: 'Сократили время ответа', results: 'Запущен', leadName: 'Иванов',
      status: 'PILOT', agentPassportPdf: '/p.pdf', files: [{ type: 'LINK', url: 'https://bot.example.kz' }],
    })).toEqual([])
  })
})
