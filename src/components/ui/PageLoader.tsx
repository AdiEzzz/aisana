/**
 * Единый лоадер для публичных страниц.
 * Повторяет каркас PageLayout (тёмный хедер + светлое полотно),
 * поэтому при дозагрузке нет ни «прыжка» фона, ни серых блоков-скелетонов —
 * только небольшой спиннер по центру.
 */
export function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="h-14 gov-header border-b border-white/10" />
      <div className="flex-1 flex items-center justify-center">
        <div
          role="status"
          aria-label="Загрузка"
          className="w-7 h-7 border-[2.5px] border-slate-200 border-t-blue-600 rounded-full animate-spin"
        />
      </div>
    </div>
  )
}
