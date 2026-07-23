# Инструкция по применению патча (июль 2026)

## Что изменилось в этом патче

| # | Проблема | Решение |
|---|----------|---------|
| 1 | Утёкший Gemini API-ключ в `.env` | Ключ убран. **Отзови старый и создай новый** |
| 2 | `prisma db push --accept-data-loss` при каждом старте | Переход на `prisma migrate deploy` + baseline-миграция `0_init` |
| 3 | Postgres наружу с паролем `password` | Порт 5432 больше не пробрасывается; пароль — из `.env` |
| 4 | Нет rate limiting | Логин: 5/15мин на IP+email, 20/15мин на IP. ИИ-поиск: 10/мин, 100/час на IP |
| 5 | Накрутка счётчика просмотров через curl | Серверная дедупликация: 1 IP = 1 просмотр проекта в час |
| 6 | `searchHitCount` накручивался повторными поисками | Дедупликация: 1 IP = 1 попадание на проект в час |
| 7 | `take: 150` — старые проекты выпадали из ИИ-поиска | Лимит убран |
| 8 | Проверка PDF по заголовку браузера | Проверка магических байт `%PDF-` |
| 9 | Осиротевшие PDF на диске при замене/удалении | Автоудаление старых локальных файлов (паспорт, файлы, при удалении проекта) |
| 10 | Нет `package-lock.json`, `npm install` в Docker | Lockfile добавлен, `npm ci` |
| 11 | Поиск только по названию | + по описанию и тегам |
| 12 | `images.remotePatterns: '**'` (открытый прокси) | Блок удалён (next/image не используется) |
| 13 | Мёртвые NEXTAUTH-переменные, docker-entrypoint.sh | Удалены |

`ignoreBuildErrors: true` пока оставлен (см. шаг 6).

---

## Шаг 0. Перед всем — бэкап и ключ

```powershell
# Бэкап боевого volume (если ещё не сделал)
docker run --rm -v ai_mapkz_postgres_data:/data -v ${PWD}:/backup alpine tar czf /backup/db_backup_2026-07-02.tar.gz -C /data .
```

Отзови старый Gemini-ключ и создай новый: https://aistudio.google.com/app/apikey

## Шаг 1. Смена пароля Postgres в существующей базе

**Важно:** `POSTGRES_PASSWORD` в docker-compose применяется только при первичной
инициализации volume. У существующей базы пароль надо сменить вручную,
ПОКА ЕЩЁ работает старая конфигурация:

```powershell
# при запущенном старом docker compose:
docker exec -it ai_map_kz_db psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'ТВОЙ_НОВЫЙ_ПАРОЛЬ';"
docker compose down
```

## Шаг 2. Применение патча

1. Распакуй архив поверх `C:\Users\Adilet\Documents\p3` (с заменой файлов).
2. Удали вручную `docker-entrypoint.sh`, если остался (в патче его нет).
3. Открой `.env` и заполни:
   - `POSTGRES_PASSWORD` — тот же пароль, что задал в шаге 1
   - `DATABASE_URL` — впиши тот же пароль
   - `GEMINI_API_KEY` — новый ключ

## Шаг 3. (Рекомендуется) Перегенерация baseline-миграции

`prisma/migrations/0_init/migration.sql` написана вручную по схеме.
Для 100% совпадения с тем, что сгенерировала бы Prisma, выполни на своей машине:

```powershell
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
```

(нужен установленный `node_modules`: `npm ci`). Если пропустишь этот шаг —
не страшно: на твоей существующей базе миграция всё равно только помечается
как применённая и её SQL не выполняется.

## Шаг 4. Пересборка и запуск

```powershell
docker compose build --no-cache
docker compose up -d
docker compose logs -f migrate
```

В логах migrate при первом запуске будет:
```
⏳ Applying migrations (prisma migrate deploy)...
Error: P3005 ... database schema is not empty        ← это ОЖИДАЕМО
⚠️  Deploy failed — baselining existing database (0_init)...
✅ Migration & seed complete!
```

Дальнейшие запуски пройдут без ошибки. Данные не трогаются.

## Шаг 5. Чек-лист проверки

- [ ] Главная карта открывается, регионы кликаются
- [ ] Логин админом работает; 6 неверных паролей подряд → «Слишком много попыток»
- [ ] Страница проекта: счётчик просмотров +1, повторное обновление страницы НЕ увеличивает
- [ ] ИИ-поиск возвращает результаты (новый ключ работает)
- [ ] Загрузка паспорта PDF работает; попытка переименовать .txt в .pdf → отклоняется
- [ ] Замена паспорта: старый файл исчезает из `docker exec ai_map_kz_app ls public/uploads`
- [ ] Импорт Excel работает
- [ ] `docker exec ai_map_kz_db psql -U postgres -c "\dt" ai_map_kz` — все таблицы на месте
- [ ] С хоста `psql -h localhost -p 5432` больше НЕ подключается (порт закрыт) ✓

## Шаг 6. Потом, когда будет время

1. **TypeScript:** выполни `npx tsc --noEmit`. Если ошибок нет или после их
   исправления — убери `ignoreBuildErrors: true` из `next.config.js`.
2. **Будущие изменения схемы:** теперь только через
   `npx prisma migrate dev --name что_поменял` (локально) — миграция
   закоммитится и применится на сервере через `migrate deploy` автоматически.
   Больше никаких `db push` на боевой базе.
3. Смени пароль админа `admin123`, если ещё дефолтный.

## Откат (если что-то пошло не так)

```powershell
docker compose down
# восстановление volume из бэкапа:
docker run --rm -v ai_mapkz_postgres_data:/data -v ${PWD}:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/db_backup_2026-07-02.tar.gz -C /data"
# затем вернуть старую версию кода и docker compose up -d
```
