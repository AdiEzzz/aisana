'use client'

import { Navbar } from './Navbar'
import { useLang } from '@/context/LangContext'

export function PageLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLang()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-5">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-center md:text-left">
              <p>© 2026 АО «НАРИ «QazInnovations»</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-slate-300">{t('footer', 'portal')}</p>
              <span className="text-slate-200">·</span>
              <p>{t('footer', 'madeBy')}: <span className="text-slate-500 font-medium">А.Д.</span></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
