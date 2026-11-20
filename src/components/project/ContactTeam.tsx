'use client'

import { useState } from 'react'
import { MessageSquare, Loader2, Check } from 'lucide-react'

interface Props {
  projectId: string
  /** Почта, на которую команда ответит, — учётная запись отправителя */
  replyTo: string
  defaultOrganization?: string | null
}

/**
 * «Связаться с командой»: сообщение команде проекта.
 * Сообщение получают представитель вуза и модераторы портала, ответ приходит
 * на почту отправителя.
 */
export function ContactTeam({ projectId, replyTo, defaultOrganization }: Props) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [organization, setOrganization] = useState(defaultOrganization ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, organization: organization || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Не удалось отправить сообщение')
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-slate-700">Связаться с командой</h2>

      {sent ? (
        <p className="flex items-start gap-2 text-sm text-emerald-700">
          <Check size={15} className="mt-0.5 shrink-0" />
          Сообщение отправлено. Команда ответит на {replyTo}.
        </p>
      ) : !open ? (
        <>
          <p className="mb-3 text-xs text-slate-400">
            Вопрос о проекте, предложение о внедрении или сотрудничестве. Команда ответит на вашу почту.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <MessageSquare size={14} /> Написать команде
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="mt-2 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Организация</label>
            <input value={organization} onChange={e => setOrganization(e.target.value)} maxLength={200}
              className={inputCls} placeholder="Откуда вы" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Сообщение</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} required minLength={10} maxLength={4000}
              rows={5} className={`${inputCls} resize-none`}
              placeholder="Что вас интересует: демонстрация, пилот у себя, совместная работа" />
          </div>
          <p className="text-xs text-slate-400">Ответ придёт на {replyTo}.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Отправка…' : 'Отправить'}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
