'use client'

import { useLang } from '@/context/LangContext'

interface Props {
  stats: { totalUniversities: number; totalProjects: number }
}

export function MapOverlay({ stats }: Props) {
  const { t } = useLang()

  return (
    <>
      {/* Stats top-left */}
      <div className="absolute top-4 left-4 z-20 flex gap-3">
        {[
          { label: t('home', 'universities'), value: stats.totalUniversities, color: 'from-blue-500 to-blue-700' },
          { label: t('home', 'aiProjects'), value: stats.totalProjects, color: 'from-violet-500 to-violet-700' },
        ].map(stat => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.color} rounded-xl px-5 py-3 text-white shadow-lg backdrop-blur-sm border border-white/10`}
          >
            <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
            <div className="text-xs font-medium text-white/80 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Title center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
        <p className="text-white/50 text-xs tracking-[0.2em] uppercase font-medium">
          {t('home', 'ministry')}
        </p>
        <h1 className="text-white text-lg font-bold mt-1 tracking-wide">
          {t('home', 'title')}
        </h1>
      </div>

      {/* Legend bottom-right */}
      <div className="absolute bottom-6 right-4 z-20 bg-[#0d1b3e]/90 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3 font-medium">
          {t('home', 'legendTitle')}
        </p>
        <div className="flex flex-col gap-2">
          {[
            { label: '0', color: '#1e3a5f' },
            { label: '1–5', color: '#1d4ed8' },
            { label: '6–15', color: '#2563eb' },
            { label: '16–30', color: '#3b82f6' },
            { label: '30+', color: '#60a5fa' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-white/70 text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
