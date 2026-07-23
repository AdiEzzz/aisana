export const dynamic = 'force-dynamic'

import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { ProjectImportForm } from '@/components/import/ProjectImportForm'
import { UniversityImportForm } from '@/components/import/UniversityImportForm'
import { ImportTabs } from '@/components/import/ImportTabs'

const PROJECT_COLUMNS = [
  ['Название проекта', 'обязательно'],
  ['Описание', 'если пусто — подставится значение по умолчанию'],
  ['Вуз', 'id, аббревиатура или полное название'],
  ['Категория', 'Образование / Наука / Управление / Аналитика / Генеративный ИИ / Компьютерное зрение / Робототехника'],
  ['Статус', 'Идея / Прототип / Пилот / Внедрено / Масштабировано'],
  ['Руководитель', 'ФИО руководителя проекта'],
  ['Email', 'email руководителя'],
  ['Технологии', 'через запятую или точку с запятой'],
  ['Теги', 'через запятую или точку с запятой'],
  ['Дата запуска', 'в формате ДД.ММ.ГГГГ'],
]

const UNIVERSITY_COLUMNS = [
  ['Название', 'обязательно — полное название вуза'],
  ['Аббревиатура', 'краткое название: КазНУ, НУ, КарТУ…'],
  ['Название на казахском', 'необязательно'],
  ['Регион', 'обязательно — название региона или код (AST, ALA…)'],
  ['Тип', 'Государственный / Частный / Национальный / Исследовательский'],
  ['Ректор', 'ФИО ректора'],
  ['Адрес', 'почтовый адрес'],
  ['Сайт', 'https://...'],
  ['Email', 'официальный email'],
  ['Телефон', 'контактный телефон'],
  ['Описание', 'краткое описание вуза'],
]

export default async function AdminImportPage() {
  const user = await requireRole([UserRole.ADMIN, UserRole.EDITOR, UserRole.UNIVERSITY_REP], '/admin/import')
  const canImportUniversities = user.role === UserRole.ADMIN || user.role === UserRole.EDITOR

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Импорт данных</h1>
        <p className="mt-1 text-sm text-slate-500">
          {canImportUniversities
            ? 'Массовая загрузка вузов и проектов из таблицы Excel или CSV.'
            : 'Массовая загрузка проектов вашего вуза из таблицы Excel или CSV.'}
        </p>
      </div>

      <ImportTabs
        projectForm={<ProjectImportForm />}
        universityForm={<UniversityImportForm />}
        projectColumns={PROJECT_COLUMNS}
        universityColumns={UNIVERSITY_COLUMNS}
        showUniversitiesTab={canImportUniversities}
      />
    </div>
  )
}
