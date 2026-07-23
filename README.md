# Национальная карта ИИ-решений вузов МНВО РК

Веб-платформа для мониторинга и анализа ИИ-проектов университетов Казахстана.

## Стек технологий

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **UI:** Recharts, React Simple Maps, Lucide Icons
- **Backend:** Next.js API Routes
- **БД:** PostgreSQL + Prisma ORM
- **Деплой:** Docker / Vercel

---

## Быстрый старт (локально)

### 1. Клонирование и установка

```bash
git clone <repo-url>
cd ai-map-kz
npm install
```

### 2. Настройка окружения

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
POSTGRES_PASSWORD=<надёжный-пароль>
DATABASE_URL="postgresql://postgres:<надёжный-пароль>@localhost:5432/ai_map_kz"
```

### 3. База данных

```bash
# Применить схему
npx prisma migrate deploy

# Заполнить демо-данными (4 вуза, 6 проектов)
npm run db:seed
```

### 4. Запуск

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

---

## Запуск через Docker

```bash
# Запустить БД и приложение
docker-compose up -d

# Применить миграции и seed
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed
```

---

## Структура проекта

```
src/
├── app/
│   ├── page.tsx                    # Главная — интерактивная карта
│   ├── dashboard/                  # Дашборд со статистикой
│   ├── universities/               # Список и детали вузов
│   ├── projects/                   # Список и детали проектов
│   ├── regions/[code]/             # Страница региона
│   ├── best-practices/             # Лучшие практики
│   ├── hearings/                   # Заслушивания
│   ├── admin/                      # Административная панель
│   │   ├── universities/           # CRUD вузов
│   │   ├── projects/               # CRUD проектов
│   │   └── hearings/               # CRUD заслушиваний
│   └── api/                        # REST API
│       ├── universities/
│       ├── projects/
│       └── hearings/
├── components/
│   ├── layout/                     # Navbar, PageLayout
│   ├── map/                        # Карта Казахстана
│   ├── charts/                     # Recharts компоненты
│   ├── forms/                      # Формы редактирования
│   └── ui/                         # Badges, Cards, Toaster
├── lib/
│   ├── prisma.ts                   # Prisma client
│   └── utils.ts                    # Утилиты
├── types/
│   └── index.ts                    # TypeScript типы
└── prisma/
    ├── schema.prisma               # Схема БД
    └── seed.ts                     # Демо-данные
```

---

## API Reference

### Вузы
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/universities` | Список вузов |
| POST | `/api/universities` | Создать вуз |
| PUT | `/api/universities/:id` | Обновить вуз |
| DELETE | `/api/universities/:id` | Удалить вуз |

### Проекты
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/projects` | Список проектов |
| POST | `/api/projects` | Создать проект |
| PUT | `/api/projects/:id` | Обновить проект |
| DELETE | `/api/projects/:id` | Удалить проект |

### Заслушивания
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/hearings` | Список заслушиваний |
| POST | `/api/hearings` | Создать заслушивание |
| PUT | `/api/hearings/:id` | Обновить заслушивание |
| DELETE | `/api/hearings/:id` | Удалить заслушивание |

---

## Административная панель

Доступна по адресу `/admin`

Возможности:
- ✅ CRUD вузов (создание, редактирование, удаление)
- ✅ CRUD проектов с полной формой
- ✅ CRUD заслушиваний с составом комиссии
- ✅ Управление технологиями через теги

---

## Демо-данные

После `npm run db:seed` создаются:
- **20 регионов** Казахстана
- **4 демо-вуза** (КазНУ, НУ, КарТУ, ЮКУ)
- **6 демо-проектов** разных категорий и статусов
- **1 демо-заслушивание**

---

## Деплой на Vercel

```bash
npm install -g vercel
vercel

# Установите переменные окружения в Vercel Dashboard:
# DATABASE_URL=<ваша-postgres-строка>
```

---

## Добавление данных

Вузы и проекты добавляются через:

1. **Административную панель** → `/admin`
2. **API** (см. API Reference выше)
3. **Prisma Studio** → `npm run db:studio`
