#!/bin/sh
# ── Ежедневный бэкап PostgreSQL с ротацией ──────────────────
# Запускается в контейнере backup (см. docker-compose.yml).
# Формат custom (-F c): компактный, восстанавливается через pg_restore
# целиком или выборочно по таблицам.
#
# Разовый бэкап вручную:
#   docker compose exec backup /backup.sh once
set -eu

BACKUP_DIR=/backups
RETENTION_DAYS=14
INTERVAL_SECONDS=86400   # раз в сутки

do_backup() {
  ts=$(date +%Y-%m-%d_%H%M%S)
  file="$BACKUP_DIR/ai_map_kz_$ts.dump"
  echo "[$(date '+%F %T')] pg_dump -> $file"
  pg_dump -h db -U postgres -d ai_map_kz -F c -f "$file"
  echo "[$(date '+%F %T')] готово: $(du -h "$file" | cut -f1)"

  # Ротация: удаляем дампы старше RETENTION_DAYS дней
  find "$BACKUP_DIR" -name 'ai_map_kz_*.dump' -mtime +"$RETENTION_DAYS" -delete
  echo "[$(date '+%F %T')] в хранилище: $(ls "$BACKUP_DIR" | wc -l) файлов"
}

if [ "${1:-}" = "once" ]; then
  do_backup
  exit 0
fi

# Первый бэкап сразу при старте, дальше по интервалу.
# Ошибка одного прогона не убивает цикл — следующая попытка через сутки.
while true; do
  do_backup || echo "[$(date '+%F %T')] ОШИБКА БЭКАПА — повтор через сутки"
  sleep "$INTERVAL_SECONDS"
done
