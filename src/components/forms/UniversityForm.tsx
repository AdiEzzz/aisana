'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Region {
  id: string
  name: string
  code: string
}

interface University {
  id?: string
  name?: string
  nameKz?: string | null
  shortName?: string | null
  regionId?: string
  address?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  rector?: string | null
  description?: string | null
  type?: string
}

interface Props {
  regions: Region[]
  university?: University
}

const TYPES = [
  { value: 'STATE', label: 'Государственный' },
  { value: 'PRIVATE', label: 'Частный' },
  { value: 'NATIONAL', label: 'Национальный' },
  { value: 'RESEARCH', label: 'Исследовательский' },
]

export function UniversityForm({ regions, university }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!university?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      nameKz: (form.elements.namedItem('nameKz') as HTMLInputElement).value || null,
      shortName: (form.elements.namedItem('shortName') as HTMLInputElement).value || null,
      regionId: (form.elements.namedItem('regionId') as HTMLSelectElement).value,
      address: (form.elements.namedItem('address') as HTMLInputElement).value || null,
      website: (form.elements.namedItem('website') as HTMLInputElement).value || null,
      email: (form.elements.namedItem('email') as HTMLInputElement).value || null,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value || null,
      rector: (form.elements.namedItem('rector') as HTMLInputElement).value || null,
      description: (form.elements.namedItem('description') as HTMLTextAreaElement).value || null,
      type: (form.elements.namedItem('type') as HTMLSelectElement).value,
    }

    try {
      const url = isEdit ? `/api/universities/${university.id}` : '/api/universities'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ошибка сохранения')
      }

      // Нативный переход: возврат в список — явное подтверждение сохранения
      window.location.href = '/admin/universities'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, name: string, defaultValue?: string | null, required = false, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue || ''}
        required={required}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          {field('Полное название', 'name', university?.name, true)}
        </div>
        {field('Название на казахском', 'nameKz', university?.nameKz)}
        {field('Аббревиатура (КазНУ, НУ...)', 'shortName', university?.shortName)}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Регион <span className="text-red-500">*</span>
          </label>
          <select
            name="regionId"
            defaultValue={university?.regionId || ''}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Выберите регион —</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Тип</label>
          <select
            name="type"
            defaultValue={university?.type || 'STATE'}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {field('Ректор', 'rector', university?.rector)}
        {field('Адрес', 'address', university?.address)}
        {field('Сайт', 'website', university?.website, false, 'url')}
        {field('Email', 'email', university?.email, false, 'email')}
        {field('Телефон', 'phone', university?.phone, false, 'tel')}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
        <textarea
          name="description"
          defaultValue={university?.description || ''}
          rows={4}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать вуз'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}
