'use client'

import { useState } from 'react'
import { FileText, Bot, Paperclip, BarChart2 } from 'lucide-react'

interface Tab {
  id: string
  label: string
  icon: React.ElementType
}

const TABS: Tab[] = [
  { id: 'overview',  label: 'Обзор',           icon: FileText  },
  { id: 'passport',  label: 'Паспорт агента',   icon: Bot       },
  { id: 'files',     label: 'Файлы и ссылки',   icon: Paperclip },
  { id: 'stats',     label: 'Статистика',        icon: BarChart2 },
]

interface Props {
  overview:  React.ReactNode
  passport:  React.ReactNode
  files:     React.ReactNode
  stats:     React.ReactNode
}

export function ProjectTabs({ overview, passport, files, stats }: Props) {
  const [active, setActive] = useState('overview')

  const content: Record<string, React.ReactNode> = { overview, passport, files, stats }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              active === tab.id
                ? 'border-blue-500 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>{content[active]}</div>
    </div>
  )
}
