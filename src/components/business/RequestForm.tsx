'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { INDUSTRIES } from '@/lib/industries'

/** Форма запроса бизнеса: задача, под которую он ищет ИИ-решение. */
export function RequestForm({ defaultDescription = '' }: { defaultDescription?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/business/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          industry: form.get('industry') || null,
          expectation: form.get('expectation') || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Не удалось сохранить задачу')
      window.location.href = `/business/requests/${data.id}`
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'mb-1 block text-sm font-medium text-slate-700'

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div>
        <label className={labelCls}>Задача одной строкой <span className="text-red-500">*</span></label>
        <input name="title" required minLength={5} maxLength={200} className={inputCls}
          placeholder="Автоматически разбирать входящие заявки клиентов" />
      </div>
      <div>
        <label className={labelCls}>Описание <span className="text-red-500">*</span></label>
        <textarea name="description" defaultValue={defaultDescription} required minLength={30} maxLength={6000} rows={6} className={`${inputCls} resize-none`}
          placeholder="Что происходит сейчас, что мешает, какие данные есть, сколько людей этим занято" />
        <p className="mt-1 text-xs text-slate-400">Не короче 30 символов. Задачу увидят представители вузов. Не указывайте коммерческую тайну и персональные данные.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelCls}>Отрасль</label>
          <select name="industry" defaultValue="" className={inputCls}>
            <option value="">— Не выбрано —</option>
            {INDUSTRIES.map(industry => <option key={industry.value} value={industry.value}>{industry.ru}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Чего вы ждёте</label>
          <input name="expectation" maxLength={2000} className={inputCls} placeholder="Пилот на одном филиале за три месяца" />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Сохранение…' : 'Опубликовать задачу'}
        </button>
        <a href="/business/requests" className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</a>
      </div>
    </form>
  )
}
