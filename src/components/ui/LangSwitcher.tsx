'use client'

import { useLang } from '@/context/LangContext'
import { LANGUAGES } from '@/lib/i18n'

export function LangSwitcher() {
  const { lang, setLang } = useLang()

  return (
    <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            lang === l.code
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-white/70 hover:text-white'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
