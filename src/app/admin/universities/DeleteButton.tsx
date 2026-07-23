'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function DeleteUniversityButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (loading) return
    if (!confirm(`Удалить вуз «${name}»? Все проекты также будут удалены.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/universities/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Ошибка удаления')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 border border-red-100 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      Удалить
    </button>
  )
}

export function DeleteProjectButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (loading) return
    if (!confirm(`Удалить проект «${name}»?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Ошибка удаления')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 border border-red-100 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      Удалить
    </button>
  )
}

export function DeleteHearingButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (loading) return
    if (!confirm('Удалить это заслушивание?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/hearings/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Ошибка удаления')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 border border-red-100 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      Удалить
    </button>
  )
}
