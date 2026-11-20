'use client'

import { useState } from 'react'
import { Loader2, MessageSquare } from 'lucide-react'

interface Props {
  /** Проект, команде которого пишет бизнес, или который предлагает вуз */
  projectId?: string
  /** Запрос бизнеса, на который откликается вуз */
  requestId?: string
  /** Куда перейти после отправки: страница диалога без идентификатора */
  chatBasePath: '/business/chats' | '/admin/chats'
  title: string
  hint: string
  placeholder: string
  buttonLabel: string
  /** Свои опубликованные проекты вуза — чтобы предложить один из них */
  projectOptions?: { id: string; title: string }[]
}

/** Первое сообщение диалога: создаёт диалог и открывает его. */
export function StartChat({ projectId, requestId, chatBasePath, title, hint, placeholder, buttonLabel, projectOptions }: Props) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [offered, setOffered] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectId ?? (offered || null), requestId: requestId ?? null, message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Не удалось отправить сообщение')
      window.location.href = `${chatBasePath}/${data.id}`
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-slate-700">{title}</h2>
      {!open ? (
        <>
          <p className="mb-3 text-xs text-slate-400">{hint}</p>
          <button type="button" onClick={() => setOpen(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <MessageSquare size={14} /> {buttonLabel}
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="mt-2 space-y-3">
          {projectOptions && projectOptions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Какой проект предлагаете</label>
              <select value={offered} onChange={e => setOffered(e.target.value)} className={inputCls}>
                <option value="">— Без привязки к проекту —</option>
                {projectOptions.map(option => <option key={option.id} value={option.id}>{option.title}</option>)}
              </select>
            </div>
          )}
          <textarea value={message} onChange={e => setMessage(e.target.value)} required minLength={2} maxLength={4000}
            rows={5} className={`${inputCls} resize-none`} placeholder={placeholder} />
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
