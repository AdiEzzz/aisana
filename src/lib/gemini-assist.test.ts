import { describe, expect, it } from 'vitest'
import { readInteraction, stripContacts } from '@/lib/gemini-assist'

describe('контакты в тексте для модели', () => {
  it('скрывает почту, телефон и ссылку на мессенджер', () => {
    const text = stripContacts('Автор: aidar@example.kz, тел. +7 (701) 123-45-67, 87011234567, https://t.me/aidar_bot')
    expect(text).not.toMatch(/example\.kz|701|t\.me/)
    expect(text.match(/контакт скрыт/g)?.length).toBe(4)
  })

  it('не трогает обычные числа и адреса сайтов', () => {
    const text = 'Обработано 87 000 обращений за 2026 год, сайт https://bot.example.kz'
    expect(stripContacts(text)).toBe(text)
  })
})

describe('разбор ответа поиска', () => {
  const payload = {
    steps: [
      { type: 'thought', content: [{ type: 'text', text: 'думаю' }] },
      { type: 'google_search_call', arguments: { queries: ['чат-бот приёмной комиссии'] } },
      {
        type: 'model_output',
        content: [
          {
            type: 'text',
            text: '{"analogs": []}',
            annotations: [
              { type: 'url_citation', url: 'https://example.com/a', title: 'example.com' },
              { type: 'url_citation', url: 'https://example.com/a', title: 'example.com' },
              { type: 'url_citation', url: 'javascript:alert(1)', title: 'bad' },
            ],
          },
        ],
      },
    ],
  }

  it('берёт текст только из вывода модели', () => {
    expect(readInteraction(payload).text).toBe('{"analogs": []}')
  })

  it('собирает ссылки без повторов и без небезопасных схем', () => {
    expect(readInteraction(payload).sources).toEqual([{ url: 'https://example.com/a', title: 'example.com' }])
  })

  it('не падает на неожиданном ответе', () => {
    expect(readInteraction(null)).toEqual({ text: '', sources: [] })
  })
})
