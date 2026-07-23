'use client'

import { Eye, Search, TrendingUp, Calendar } from 'lucide-react'
import { formatDateLong } from '@/lib/utils'

interface Props {
  viewCount: number
  searchHitCount: number
  createdAt: Date | string
  updatedAt: Date | string
  status: string
  launchDate?: Date | string | null
}

export function ProjectStatsTab({ viewCount, searchHitCount, createdAt, updatedAt, status, launchDate }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Eye,       label: 'Просмотров',       value: viewCount,       color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { icon: Search,    label: 'Найден ИИ-поиском', value: searchHitCount,  color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl p-5 border border-slate-100`}>
            <item.icon size={20} className={`${item.color} mb-2`} />
            <div className="text-3xl font-bold text-slate-800 tabular-nums">{item.value}</div>
            <div className="text-xs text-slate-500 mt-1">{item.label}</div>
          </div>
        ))}

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
          <Calendar size={20} className="text-slate-400 mb-2" />
          <div className="text-sm font-semibold text-slate-700">Добавлен</div>
          <div className="text-xs text-slate-500 mt-1">{formatDateLong(createdAt)}</div>
        </div>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
          <TrendingUp size={20} className="text-slate-400 mb-2" />
          <div className="text-sm font-semibold text-slate-700">Обновлён</div>
          <div className="text-xs text-slate-500 mt-1">{formatDateLong(updatedAt)}</div>
        </div>
      </div>

      {launchDate && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Временная шкала</h3>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div className="w-0.5 h-8 bg-slate-200" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">Запуск проекта</p>
                <p className="text-sm font-medium text-slate-700">{formatDateLong(launchDate)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Текущий статус</p>
                <p className="text-sm font-medium text-slate-700">{status}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        💡 Статистика просмотров обновляется при каждом посещении страницы проекта.
        Счётчик ИИ-поиска увеличивается когда Gemini включает проект в результаты поиска.
      </div>
    </div>
  )
}
