/**
 * Заставка разделов кабинета партнёра.
 *
 * Без неё при переходах срабатывала общая заставка портала — тёмный экран на
 * всю страницу. Эта остаётся внутри кабинета: шапка и меню на месте,
 * меняется только содержимое.
 */
export default function BusinessLoading() {
  return (
    <div aria-busy="true" aria-label="Загрузка" className="space-y-4">
      <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, at) => (
          <div key={at} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    </div>
  )
}
