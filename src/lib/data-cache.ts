// ── Кэш данных в памяти процесса (TTL) ───────────────────────
// Зачем: страницы с force-dynamic рендерятся на каждый запрос,
// но тяжёлые выборки из БД достаточно обновлять раз в минуту.
// В отличие от ISR (revalidate), этот кэш не требует доступа к БД
// на этапе `next build` — сборка Docker-образа проходит без базы.
// В отличие от unstable_cache, значения не сериализуются в JSON —
// объекты Date и вложенные структуры возвращаются как есть.

type CacheEntry = { value: unknown; expiresAt: number }

const store = new Map<string, CacheEntry>()

/**
 * Возвращает закэшированный результат fn() на ttlMs миллисекунд.
 * Одновременные промахи не дедуплицируются — для наших страниц
 * (несколько запросов к локальному Postgres) это некритично.
 */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key)
  const now = Date.now()
  if (hit && hit.expiresAt > now) return hit.value as T

  const value = await fn()
  store.set(key, { value, expiresAt: now + ttlMs })
  return value
}

/** Сбрасывает запись кэша — например, поисковый индекс после правки проекта. */
export function invalidate(key: string): void {
  store.delete(key)
}
