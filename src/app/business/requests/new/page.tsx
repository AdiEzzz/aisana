import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { RequestForm } from '@/components/business/RequestForm'

export default async function NewBusinessRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ description?: string }>
}) {
  const { description } = await searchParams
  // Запросы создаёт только бизнес; модераторы панель лишь просматривают
  await requireRole([UserRole.BUSINESS], '/business/requests/new')

  return (
    <div className="max-w-3xl">
      <Link href="/business/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Мои задачи
      </Link>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Новая задача</h1>
      <p className="mb-5 text-sm text-slate-500">
        Опишите задачу так, чтобы команда вуза поняла, что нужно. Проекты на портале студенческие и вузовские: речь о пилоте и совместной доработке, а не о покупке готового продукта. После публикации портал сразу подберёт похожие решения с витрины.
      </p>
      <RequestForm defaultDescription={(description ?? '').slice(0, 1500)} />
    </div>
  )
}
