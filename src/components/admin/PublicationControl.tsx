'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicationStatus } from '@prisma/client'
import { CheckCircle2, Loader2, Send, EyeOff, Undo2 } from 'lucide-react'
import { PUBLICATION_BADGE, PUBLICATION_LABELS } from '@/lib/publication'

interface Props {
  projectId: string
  publication: PublicationStatus
  /** Администратор или редактор — может публиковать и снимать с публикации */
  canModerate: boolean
  /** Компактный режим для таблицы */
  compact?: boolean
}

export function PublicationBadge({ publication }: { publication: PublicationStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PUBLICATION_BADGE[publication]}`}>
      {PUBLICATION_LABELS[publication]}
    </span>
  )
}

export function PublicationControl({ projectId, publication, canModerate, compact }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function change(next: PublicationStatus) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/publication`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publication: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Не удалось изменить статус')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const btn = 'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50'

  const actions: React.ReactNode[] = []

  if (publication !== PublicationStatus.PUBLISHED && canModerate) {
    actions.push(
      <button key="pub" type="button" disabled={busy} onClick={() => change(PublicationStatus.PUBLISHED)}
        className={`${btn} text-emerald-700 border-emerald-200 hover:bg-emerald-50`}>
        {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Опубликовать
      </button>
    )
  }

  if (publication === PublicationStatus.DRAFT && !canModerate) {
    actions.push(
      <button key="send" type="button" disabled={busy} onClick={() => change(PublicationStatus.REVIEW)}
        className={`${btn} text-amber-700 border-amber-200 hover:bg-amber-50`}>
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} На проверку
      </button>
    )
  }

  if (publication === PublicationStatus.REVIEW) {
    actions.push(
      <button key="back" type="button" disabled={busy} onClick={() => change(PublicationStatus.DRAFT)}
        className={`${btn} text-slate-600 border-slate-200 hover:bg-slate-50`}>
        <Undo2 size={12} /> {canModerate ? 'Вернуть на доработку' : 'В черновик'}
      </button>
    )
  }

  if (publication === PublicationStatus.PUBLISHED && canModerate) {
    actions.push(
      <button key="hide" type="button" disabled={busy} onClick={() => change(PublicationStatus.DRAFT)}
        className={`${btn} text-slate-600 border-slate-200 hover:bg-slate-50`}>
        {busy ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />} Снять с публикации
      </button>
    )
  }

  if (actions.length === 0 && !error) return null

  return (
    <div className={compact ? 'flex items-center gap-1.5' : 'flex flex-wrap items-center gap-2'}>
      {actions}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
