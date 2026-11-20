'use client'

import { useState } from 'react'
import { Globe, Loader2, Sparkles } from 'lucide-react'

interface Analog {
  name: string
  maker: string
  what: string
  difference: string
  url?: string
}

interface Source {
  url: string
  title: string
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Аналоги проекта на рынке: известные продукты, решающие ту же задачу.
 *
 * Загружаются по кнопке, а не при открытии страницы: запрос идёт к ИИ и
 * тратит квоту, а нужен не каждому посетителю.
 */
export function MarketAnalogs({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analogs, setAnalogs] = useState<Analog[] | null>(null)
  const [noDescription, setNoDescription] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [online, setOnline] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/analogs`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Не удалось подобрать аналоги')
      setNoDescription(data.reason === 'no-description')
      setSources(data.sources ?? [])
      setOnline(Boolean(data.online))
      setAnalogs(data.analogs ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Globe size={16} className="text-slate-400" />
        <h2 className="font-semibold text-slate-700">Аналоги на рынке</h2>
        {analogs === null && (
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Ищу в интернете…' : 'Найти с ИИ'}
          </button>
        )}
      </div>

      {analogs === null && !error && (
        <p className="mt-2 text-sm text-slate-400">
          ИИ найдёт в интернете продукты в мире и в Казахстане, которые решают ту же задачу.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {analogs !== null && analogs.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">
          {noDescription
            ? 'У проекта нет описания, поэтому подобрать аналоги нельзя.'
            : 'ИИ не нашёл продуктов, существование которых подтверждают источники.'}
        </p>
      )}

      {analogs !== null && analogs.length > 0 && (
        <>
          <div className="mt-4 space-y-3">
            {analogs.map(analog => (
              <div key={analog.name} className="rounded-lg border border-slate-100 p-3">
                <p className="text-sm font-medium text-slate-800">
                  {analog.url
                    ? <a href={analog.url} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-600 hover:underline">{analog.name}</a>
                    : analog.name}
                  {analog.maker && <span className="font-normal text-slate-400"> · {analog.maker}</span>}
                </p>
                <p className="mt-1 text-sm text-slate-600">{analog.what}</p>
                {analog.difference && (
                  <p className="mt-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Отличие проекта: </span>{analog.difference}
                  </p>
                )}
              </div>
            ))}
          </div>
          {online && sources.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Источники</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {sources.map(source => (
                  <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer nofollow"
                    className="text-xs text-blue-600 hover:underline">
                    {source.title || host(source.url)}
                  </a>
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-400">
            {online
              ? 'Список составлен ИИ по результатам поиска в интернете. Сведения о продуктах сверяйте по источникам.'
              : 'Поиск в интернете сейчас недоступен: список составлен ИИ по памяти. Проверьте названия перед использованием.'}
          </p>
        </>
      )}
    </div>
  )
}
