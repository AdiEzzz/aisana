'use client'

import { useState } from 'react'

interface Props {
  nextPath?: string
}

// Only allow same-site relative paths to prevent open-redirect attacks
// via crafted "?next=https://evil.com" links.
function sanitizeNextPath(path?: string): string {
  if (!path) return '/admin'
  // Must start with a single "/" (not "//" which browsers treat as protocol-relative)
  if (!path.startsWith('/') || path.startsWith('//')) return '/admin'
  // Reject anything containing a scheme marker just in case
  if (path.includes('://')) return '/admin'
  return path
}

export function LoginForm({ nextPath = '/admin' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const safeNextPath = sanitizeNextPath(nextPath)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const form = event.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Не удалось войти')
      }

      window.location.href = safeNextPath
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="admin@qazinn.kz"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Пароль</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Вход...' : 'Войти'}
      </button>
    </form>
  )
}
