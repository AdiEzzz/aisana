import type { Metadata } from 'next'
import { getSiteUrl, SITE_NAME } from '@/lib/seo'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { LangProvider } from '@/context/LangContext'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'AiSana — карта ИИ-решений ВУЗов Казахстана',
    template: '%s — AiSana',
  },
  description: 'Единый портал мониторинга и анализа ИИ-проектов университетов Казахстана',
  keywords: ['AiSana', 'ИИ', 'университеты', 'Казахстан', 'искусственный интеллект'],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'ru_RU',
    title: 'AiSana — карта ИИ-решений ВУЗов Казахстана',
    description: 'Единый портал мониторинга и анализа ИИ-проектов университетов Казахстана',
    // Превью ссылки в WhatsApp, Telegram и соцсетях
    images: [{
      url: '/images/og-image.png',
      width: 1200,
      height: 630,
      alt: 'AiSana — национальная карта ИИ-решений вузов Казахстана',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AiSana — карта ИИ-решений ВУЗов Казахстана',
    description: 'Единый портал мониторинга и анализа ИИ-проектов университетов Казахстана',
    images: ['/images/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <LangProvider>
          {children}
          <Toaster />
        </LangProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
