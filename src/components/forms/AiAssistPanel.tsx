'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Check, X, AlertCircle, CircleAlert, HelpCircle } from 'lucide-react'
import { cardChecklist, type ChecklistInput, type ChecklistItem } from '@/lib/card-checklist'

type TextField = 'description' | 'impact' | 'results'

interface Suggestions {
  description: string
  impact: string
  results: string
  tags: string[]
  questions: string[]
}

interface Props {
  /** Текущие значения полей формы — читаются в момент нажатия */
  getValues: () => ChecklistInput & { title: string; tags: string[] }
  /** Записывает принятое предложение в поле формы (без сохранения карточки) */
  applyText: (field: TextField, value: string) => void
  applyTags: (tags: string[]) => void
}

const FIELD_LABELS: Record<TextField, string> = {
  description: 'Описание',
  impact: 'Влияние',
  results: 'Результаты',
}

/**
 * ИИ-помощник в форме карточки.
 *
 * Показывает, чего не хватает карточке, и предлагает текст полей. Ничего не
 * сохраняет сам: автор принимает или отклоняет каждое предложение, а потом
 * сохраняет карточку обычной кнопкой.
 */
export function AiAssistPanel({ getValues, applyText, applyTags }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[] | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [done, setDone] = useState<Record<string, 'accepted' | 'rejected'>>({})

  async function run() {
    const values = getValues()
    setError('')
    setDone({})
    setSuggestions(null)
    setChecklist(cardChecklist(values))

    if (values.title.trim().length < 3) {
      setError('Сначала введите название проекта.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/projects/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          impact: values.impact,
          results: values.results,
          status: values.status,
          implementedAt: values.implementedAt,
          tags: values.tags,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Не удалось получить предложения')
      setSuggestions(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const mark = (key: string, state: 'accepted' | 'rejected') => setDone(prev => ({ ...prev, [key]: state }))

  const textFields = (['description', 'impact', 'results'] as TextField[]).filter(
    field => suggestions?.[field]?.trim(),
  )
  const hasTags = !!suggestions?.tags?.length
  const nothing = suggestions && textFields.length === 0 && !hasTags && !suggestions.questions.length

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-600" />
          <span className="text-sm font-semibold text-slate-800">ИИ-помощник</span>
        </div>
        <p className="min-w-0 flex-1 text-xs text-slate-500">
          Проверит, чего не хватает карточке, и предложит текст. Вы принимаете или отклоняете каждое предложение.
        </p>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Проверяю…' : 'Проверить карточку'}
        </button>
      </div>

      {checklist && (
        <div className="mt-4">
          {checklist.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700">
              <Check size={14} /> Карточка заполнена: есть описание, подтверждения, результаты и влияние.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {checklist.map(item => (
                <li key={item.key} className="flex items-start gap-2 text-sm">
                  {item.level === 'required'
                    ? <CircleAlert size={14} className="mt-0.5 shrink-0 text-red-500" />
                    : <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />}
                  <span className={item.level === 'required' ? 'text-slate-800' : 'text-slate-600'}>{item.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {suggestions && (
        <div className="mt-4 space-y-3">
          {textFields.map(field => (
            <div key={field} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                  Предложение ИИ · {FIELD_LABELS[field]}
                </span>
                {done[field] ? (
                  <span className="text-xs text-slate-400">
                    {done[field] === 'accepted' ? 'Принято — не забудьте сохранить' : 'Отклонено'}
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { applyText(field, suggestions[field]); mark(field, 'accepted') }}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                      <Check size={12} /> Принять
                    </button>
                    <button type="button" onClick={() => mark(field, 'rejected')}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <X size={12} /> Отклонить
                    </button>
                  </div>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{suggestions[field]}</p>
            </div>
          ))}

          {hasTags && (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-violet-600">Предложение ИИ · Теги</span>
                {done.tags ? (
                  <span className="text-xs text-slate-400">{done.tags === 'accepted' ? 'Добавлено — не забудьте сохранить' : 'Отклонено'}</span>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { applyTags(suggestions.tags); mark('tags', 'accepted') }}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                      <Check size={12} /> Добавить
                    </button>
                    <button type="button" onClick={() => mark('tags', 'rejected')}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <X size={12} /> Отклонить
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.tags.map(tag => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {suggestions.questions.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <HelpCircle size={12} /> Что стоит уточнить
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {suggestions.questions.map(question => <li key={question}>{question}</li>)}
              </ul>
            </div>
          )}

          {nothing && <p className="text-sm text-slate-600">Текст карточки в порядке, предложений нет.</p>}

          <p className="text-xs text-slate-400">
            Текст составлен ИИ по данным карточки. Пометки [уточните: …] замените фактами перед сохранением.
          </p>
        </div>
      )}
    </div>
  )
}
