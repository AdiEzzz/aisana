Национальная карта ИИ-решений вузов МНВО РК (AiSana)

Веб-платформа для мониторинга и анализа ИИ-проектов университетов Казахстана.

Стек технологий
Frontend: Next.js 15, TypeScript, Tailwind CSS
UI: Recharts, React Simple Maps, Framer Motion, Lucide Icons
Backend: Next.js API Routes
БД: PostgreSQL 16 + Prisma ORM
ИИ-поиск: Google Gemini API
Деплой: Docker (compose: db + migrate + app + backup)
Быстрый старт (локально)
1. Клонирование и установка
bash
git clone <repo-url>
cd ai-map-kz
npm install
2. Настройка окружения
bash
cp .env.example .env

Отредактируйте .env:

env
POSTGRES_PASSWORD=<надёжный-пароль>
DATABASE_URL="postgresql://postgres:<надёжный-пароль>@localhost:5432/ai_map_kz"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GEMINI_API_KEY=<ключ из https://aistudio.google.com/app/apikey>
3. База данных
bash
# Применить миграции (ничего не удаляет, только закоммиченные миграции)
npx prisma migrate deploy

# Базовый сид: 20 регионов, 7 групп технологий, админ (создаётся только если админов нет)
npm run db:seed

Демо-данных больше нет. Сид не создаёт вузы и проекты — рабочая база уже наполнена реальными данными. Свежие дампы лежат в ./backups/*.dump, восстановление — см. BACKUPS.md. На чистой базе данные добавляются через админку или импорт из Excel/CSV (/admin/import).

4. Запуск
bash
npm run dev

Откройте http://localhost:3000

Вход в админку: /login → после сида admin@mnvo.kz / admin123 (смените пароль после первого входа).

Запуск через Docker
bash
docker-compose up -d --build

Больше ничего запускать не нужно:

сервис migrate сам применяет миграции (prisma migrate deploy) и сид, на существующей базе при необходимости делает baseline 0_init;
сервис backup делает pg_dump раз в сутки в ./backups (дампы старше 14 дней удаляются; вручную: docker compose exec backup /backup.sh once);
db (PostgreSQL 16) наружу не пробрасывается — доступен только внутри docker-сети;
app слушает :3000, состояние — GET /api/health.

Подробнее о бэкапах и восстановлении — BACKUPS.md.

Роли и доступ
Роль	Права
ADMIN	Всё: вузы, проекты, слушания, пользователи, импорт, аудит
EDITOR	Весь контент (вузы, проекты, слушания, импорт), без пользователей
UNIVERSITY_REP	Только проекты и файлы своего вуза
VIEWER	Просмотр админки без права записи

Защита: сессии в БД (httpOnly-cookie, 30 дней), rate limiting логина (5 попыток на IP+email / 20 на IP за 15 мин), журнал аудита всех изменений.

Структура проекта
src/
├── app/
│   ├── page.tsx                 # Главная — интерактивная карта
│   ├── dashboard/               # Дашборд со статистикой
│   ├── universities/            # Список и детали вузов
│   ├── projects/                # Список и детали проектов
│   ├── regions/[code]/          # Страница региона
│   ├── best-practices/          # Лучшие практики
│   ├── hearings/                # Заслушивания
│   ├── ai-search/               # ИИ-поиск проектов (Gemini)
│   ├── login/                   # Вход
│   ├── admin/                   # Админка
│   │   ├── universities/        # CRUD вузов
│   │   ├── projects/            # CRUD проектов
│   │   ├── hearings/            # CRUD заслушиваний
│   │   ├── users/               # Пользователи и роли
│   │   ├── import/              # Импорт вузов/проектов из Excel/CSV
│   │   └── audit/               # Журнал аудита
│   ├── api/                     # REST API (см. ниже)
│   ├── sitemap.ts / robots.ts   # SEO
├── components/
│   ├── layout/                  # Navbar, PageLayout
│   ├── map/                     # Карта Казахстана
│   ├── charts/                  # Recharts-компоненты
│   ├── forms/                   # Формы (проект, вуз, слушание)
│   ├── import/                  # Формы импорта
│   ├── project/                 # Паспорт агента, файлы, статистика
│   ├── auth/                    # Логин/логаут
│   └── ui/                      # Badges, Cards, Toaster
├── lib/
│   ├── prisma.ts                # Prisma client
│   ├── auth.ts                  # Сессии, роли, guard-функции
│   ├── rate-limit.ts            # Rate limiting и дедупликация счётчиков
│   ├── audit.ts                 # Журнал аудита
│   ├── project-import.ts        # Импорт проектов из Excel/CSV
│   ├── university-import.ts     # Импорт вузов из Excel/CSV
│   ├── uploads.ts               # Очистка локальных PDF
│   ├── data-cache.ts            # In-memory кэш тяжёлых выборок (60 сек)
│   └── i18n.ts / seo.ts / utils.ts
├── context/LangContext.tsx      # Переключение языка (ru/kz)
└── prisma/
    ├── schema.prisma            # Схема БД
    ├── migrations/              # Миграции (migrate deploy)
    └── seed.ts                  # Регионы, технологии, админ
API Reference

Публичные (без авторизации):

Метод	URL	Описание
GET	/api/health	Здоровье приложения и БД
GET	/api/universities, /api/universities/:id	Вузы
GET	/api/projects, /api/projects/:id	Проекты (поиск: ?q=&status=&category=)
GET	/api/hearings, /api/hearings/:id	Заслушивания
POST	/api/projects/:id/view	Счётчик просмотров (дедуп по IP, 1/час)
POST	/api/ai-search	ИИ-поиск (rate limit 10/мин, 100/час на IP)
POST	/api/auth/login, /api/auth/logout	Вход/выход

Требуют авторизации (роль в скобках):

Метод	URL	Описание
POST/PUT/DELETE	/api/universities...	CRUD вузов (ADMIN/EDITOR, удаление — ADMIN)
POST/PUT/DELETE	/api/projects...	CRUD проектов (+UNIVERSITY_REP для своего вуза)
PUT/DELETE	/api/projects/:id/passport	Паспорт ИИ-агента (PDF/ссылка)
GET/POST/DELETE	/api/projects/:id/files	Файлы проекта (акты, презентации, ссылки)
POST/PUT/DELETE	/api/hearings...	CRUD заслушиваний (ADMIN/EDITOR)
POST	/api/upload	Загрузка PDF ≤20МБ (проверка магических байт)
POST	/api/admin/import/projects	Импорт проектов из .xlsx/.xls/.csv (dry-run поддерживается)
POST	/api/admin/import/universities	Импорт вузов (ADMIN/EDITOR)
POST/PATCH/DELETE	/api/admin/users	Пользователи (только ADMIN)
GET	/api/export/dashboard	Экспорт дашборда в Excel
GET	/api/ai-search/models	Диагностика моделей Gemini (ADMIN/EDITOR)
Добавление данных
Админка → /admin (вузы, проекты, слушания, файлы, паспорта агентов)
Импорт из Excel/CSV → /admin/import — сначала dry-run с отчётом об ошибках, затем боевой импорт; повторный импорт обновляет существующие записи (совпадение: вуз + название проекта)
API — см. таблицу выше
Prisma Studio → npm run db:studio
Полезные команды
bash
npm run dev          # Дев-сервер
npm run build        # Продакшен-сборка (требует интернет: Google Fonts)
npm run lint         # ESLint
npm run db:migrate   # Новая миграция (dev)
npm run db:seed      # Сид (регионы/технологии/админ)
npm run db:studio    # Prisma Studio
Примечания по деплою
Основной путь — Docker (docker-compose up -d --build).
Vercel возможен, но загруженные PDF хранятся локально в public/uploads — на Vercel нужен внешний сторедж (S3/Blob). Переменные: DATABASE_URL, GEMINI_API_KEY, NEXT_PUBLIC_APP_URL.
NEXT_PUBLIC_APP_URL укажите реальным доменом — используется в sitemap и OpenGraph.
