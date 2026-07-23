'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Lang } from '@/lib/i18n'
import { translations } from '@/lib/i18n'

interface LangContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (section: string, key: string) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'ru',
  setLang: () => {},
  t: (_s, k) => k,
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved === 'ru' || saved === 'kz') setLangState(saved)
    setHydrated(true)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('lang', l)
    document.documentElement.lang = l === 'kz' ? 'kk' : 'ru'
  }

  function t(section: string, key: string): string {
    const sec = (translations as Record<string, Record<string, Record<Lang, string>>>)[section]
    return sec?.[key]?.[lang] ?? sec?.[key]?.['ru'] ?? key
  }

  // Avoid a flash of wrong-language content during hydration on first paint
  if (!hydrated) {
    return (
      <LangContext.Provider value={{ lang: 'ru', setLang, t }}>
        {children}
      </LangContext.Provider>
    )
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
