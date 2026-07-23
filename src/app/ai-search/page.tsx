// ISR: страница отдаётся из кэша мгновенно и пересобирается в фоне
// не чаще раза в 60 секунд — изменения из админки появляются с задержкой до минуты
export const revalidate = 60
import { PageLayout } from '@/components/layout/PageLayout'
import { AISearchWidget } from '@/components/search/AISearchWidget'

export default function AISearchPage() {
  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            ✦ Поиск проектов
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            Найдите нужный проект
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            Введите ключевые слова — поиск найдёт проекты по базе вузов Казахстана
          </p>
        </div>
        <AISearchWidget />
      </div>
    </PageLayout>
  )
}
