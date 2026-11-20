'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыта',
  IN_PROGRESS: 'В работе',
  CLOSED: 'Закрыта',
  HIDDEN: 'Скрыта модератором',
}

export const REQUEST_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-emerald-100 text-emerald-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-slate-100 text-slate-600',
  HIDDEN: 'bg-red-100 text-red-700',
}

export function RequestStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REQUEST_STATUS_COLORS[status] ?? ''}`}>
      {REQUEST_STATUS_LABELS[status] ?? status}
    </span>
  )
}

/** Смена статуса запроса: автор — открыт, в работе, закрыт; модератор — ещё и скрыть. */
export function RequestStatusControl({ id, status, moderator }: { id: string; status: string; moderator?: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const options = moderator ? ['OPEN', 'IN_PROGRESS', 'CLOSED', 'HIDDEN'] : ['OPEN', 'IN_PROGRESS', 'CLOSED']
  // Скрытый модератором запрос автор сам вернуть не может
  if (!moderator && status === 'HIDDEN') return <RequestStatusBadge status={status} />

  async function change(next: string) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/business/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Не удалось обновить статус')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <select value={status} disabled={busy} onChange={e => change(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50">
        {options.map(option => <option key={option} value={option}>{REQUEST_STATUS_LABELS[option]}</option>)}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
