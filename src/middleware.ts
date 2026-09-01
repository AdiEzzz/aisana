import { NextRequest, NextResponse } from 'next/server'

/**
 * Портал закрыт: без входа доступны только витрина (главная с картой),
 * страница входа и контакты. Всё остальное — после авторизации.
 *
 * Middleware проверяет ТОЛЬКО наличие cookie сессии: обращаться к базе
 * здесь нельзя (Edge Runtime). Настоящая проверка сессии и ролей —
 * на самих страницах и в API через requireUser / requireApiRole.
 * То есть это удобная переадресация на вход, а не единственная защита.
 */

const SESSION_COOKIE = 'ai_map_kz_session'

/** Пути, доступные без входа. Точное совпадение либо префикс с «/». */
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/contacts',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
]

/** Публичные API: вход/выход и приём обращений с формы контактов. */
const PUBLIC_API = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/feedback',
  '/api/health',
  '/api/me',
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (PUBLIC_API.some(path => pathname === path)) return true

  // Статика и служебные файлы Next.js
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/data/') ||
    pathname.startsWith('/docs/') ||
    pathname === '/favicon.ico'
  ) return true

  return false
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  if (hasSession) return NextResponse.next()

  // API отвечают кодом, а не переадресацией — иначе fetch получит HTML формы входа
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Пропускаем через middleware всё, кроме статики Next.js и картинок:
  // так проверка не тратится на каждый чанк JS и файл шрифта.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
