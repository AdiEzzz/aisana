import { isDeployedStatus, isDescriptionEmpty } from '@/lib/project-completeness'

/**
 * Чего не хватает карточке, чтобы проект считался подтверждённым.
 *
 * Наличие карточки не доказывает, что агент существует. Подтверждённым
 * считается проект с описанием и хотя бы одним подтверждением: документом
 * (паспорт агента, презентация, акт, документация) или демо (ссылка на
 * работающий продукт, видео). Правило одно для формы, помощника и отчётов.
 */

/** Описание короче — формально есть, но по нему нельзя понять, что сделано. */
export const SHORT_DESCRIPTION_LENGTH = 200

/** Хостинги документов: ссылка на них — документ, а не работающий продукт. */
const DOCUMENT_HOST = /docs\.google\.com|drive\.google\.com|disk\.yandex|onedrive|sharepoint|dropbox|\.pdf($|\?)|\.pptx?($|\?)/i

export interface ChecklistInput {
  description?: string | null
  impact?: string | null
  results?: string | null
  status?: string | null
  implementedAt?: string | null
  leadName?: string | null
  agentPassportPdf?: string | null
  presentationPdf?: string | null
  presentationPptx?: string | null
  videoUrl?: string | null
  files?: { type: string; url?: string | null }[] | null
}

export type ChecklistLevel = 'required' | 'recommended'

export interface ChecklistItem {
  key: 'description' | 'shortDescription' | 'documents' | 'demo' | 'implementedAt' | 'results' | 'impact' | 'leadName'
  level: ChecklistLevel
  text: string
}

export function hasDocuments(project: ChecklistInput): boolean {
  if (project.agentPassportPdf || project.presentationPdf || project.presentationPptx) return true
  return (project.files ?? []).some(file =>
    ['PRESENTATION', 'ACT', 'DOCUMENTATION', 'OTHER'].includes(file.type) ||
    (file.type === 'LINK' && DOCUMENT_HOST.test(file.url ?? ''))
  )
}

export function hasDemo(project: ChecklistInput): boolean {
  if (project.videoUrl) return true
  const linked = (project.files ?? []).some(file =>
    file.type === 'VIDEO' || (file.type === 'LINK' && !DOCUMENT_HOST.test(file.url ?? ''))
  )
  if (linked) return true
  // Ссылку на продукт часто пишут прямо в тексте результатов
  return /https?:\/\//.test([project.description, project.results, project.impact].filter(Boolean).join(' '))
}

/** Подтверждён ли проект: описание и хотя бы одно подтверждение. */
export function isConfirmed(project: ChecklistInput): boolean {
  return !isDescriptionEmpty(project.description) && (hasDocuments(project) || hasDemo(project))
}

/** Список того, что нужно дозаполнить, от обязательного к желательному. */
export function cardChecklist(project: ChecklistInput): ChecklistItem[] {
  const items: ChecklistItem[] = []
  const description = (project.description ?? '').replace(/\s+/g, ' ').trim()

  if (isDescriptionEmpty(project.description)) {
    items.push({ key: 'description', level: 'required', text: 'Нет описания: напишите, что делает решение, для кого и какую задачу решает.' })
  } else if (description.length < SHORT_DESCRIPTION_LENGTH) {
    items.push({ key: 'shortDescription', level: 'recommended', text: `Описание короткое (${description.length} зн.): добавьте, как решение работает и кто им пользуется.` })
  }

  const documents = hasDocuments(project)
  const demo = hasDemo(project)
  if (!documents && !demo) {
    items.push({ key: 'documents', level: 'required', text: 'Нет подтверждений: приложите паспорт агента, презентацию или акт внедрения либо ссылку на работающий продукт или видео.' })
  } else {
    if (!documents) items.push({ key: 'documents', level: 'recommended', text: 'Нет документов: приложите паспорт агента, презентацию или акт внедрения.' })
    if (!demo) items.push({ key: 'demo', level: 'recommended', text: 'Нет демо: добавьте ссылку на работающий продукт или видео.' })
  }

  if (isDeployedStatus(project.status) && !(project.implementedAt ?? '').trim()) {
    items.push({ key: 'implementedAt', level: 'required', text: 'Стадия «Внедрено», но не указано, где внедрено решение.' })
  }
  if (!(project.results ?? '').trim()) {
    items.push({ key: 'results', level: 'recommended', text: 'Не заполнены результаты: что уже сделано и работает.' })
  }
  if (!(project.impact ?? '').trim()) {
    items.push({ key: 'impact', level: 'recommended', text: 'Не заполнено влияние: измеримый эффект от решения.' })
  }
  if (!(project.leadName ?? '').trim()) {
    items.push({ key: 'leadName', level: 'recommended', text: 'Не указан руководитель проекта.' })
  }

  return items
}
