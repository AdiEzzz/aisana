# Бэкапы базы данных

## Как это работает

Сервис `backup` в docker-compose делает `pg_dump` **раз в сутки**
(первый — сразу при старте контейнера) в папку `./backups` рядом с проектом
(`C:\Users\Adilet\Documents\p3\backups`). Дампы старше **14 дней** удаляются
автоматически. Формат — custom (`.dump`), восстанавливается целиком или
по отдельным таблицам.

Проверить, что бэкапы идут:

```powershell
docker compose logs backup --tail 20
dir .\backups
```

## Разовый бэкап вручную (перед рискованными операциями)

```powershell
docker compose exec backup /backup.sh once
```

## Восстановление

**Полное восстановление** (перезаписывает текущие данные!):

```powershell
# 1. Останови приложение, чтобы никто не писал в базу
docker compose stop app

# 2. Скопируй дамп в контейнер БД и восстанови
docker cp .\backups\ai_map_kz_2026-07-07_090000.dump ai_map_kz_db:/tmp/restore.dump
docker exec ai_map_kz_db pg_restore -U postgres -d ai_map_kz --clean --if-exists /tmp/restore.dump

# 3. Запусти обратно
docker compose start app
```

**Восстановление одной таблицы** (например, случайно почистили проекты):

```powershell
docker exec ai_map_kz_db pg_restore -U postgres -d ai_map_kz --clean --if-exists -t projects /tmp/restore.dump
```

## Важно

- Папка `./backups` лежит на том же диске, что и сама база. От сбоя диска
  это не спасает — раз в неделю копируй свежий дамп на внешний носитель
  или в облако (файл небольшой, десятки мегабайт).
- `docker compose down -v` по-прежнему запрещён (снесёт volume с данными),
  но теперь после такой ошибки есть из чего восстановиться.
- После смены пароля Postgres перезапусти backup-контейнер:
  `docker compose up -d --force-recreate backup`
