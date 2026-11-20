import { describe, expect, it } from 'vitest'
import { indexProject } from '@/lib/search/engine'
import { findSimilar } from '@/lib/similar'

const uni = { name: 'Тестовый университет', shortName: 'ТУ', region: { name: 'Астана' } }

function project(id: string, title: string, description: string) {
  return indexProject({ id, title, description, tags: [], technologies: [], category: 'EDUCATION', university: uni } as any)
}

const index = [
  project('lib1', 'ИИ-библиотекарь', 'Чат-бот библиотеки университета помогает студентам искать книги в электронном каталоге'),
  project('lib2', 'Kitaphana AI', 'Агент библиотеки находит литературу в каталоге и подбирает книги по запросу читателя'),
  project('proc', 'Прокторинг экзаменов', 'Система распознаёт нарушения во время онлайн-экзамена по видео с веб-камеры'),
  project('agro', 'Мониторинг посевов', 'Дроны и компьютерное зрение оценивают состояние пшеницы на полях хозяйства'),
  project('adm', 'Помощник приёмной комиссии', 'Отвечает абитуриентам на вопросы о поступлении, грантах и документах'),
]

describe('похожие проекты', () => {
  it('находит проект той же тематики первым', () => {
    const similar = findSimilar(index, 'lib1')
    expect(similar[0]?.id).toBe('lib2')
  })

  it('не возвращает сам проект', () => {
    expect(findSimilar(index, 'lib1').map(item => item.id)).not.toContain('lib1')
  })

  it('не считает похожими проекты из другой области', () => {
    expect(findSimilar(index, 'lib1').map(item => item.id)).not.toContain('agro')
  })

  it('объясняет сходство общими словами', () => {
    const [first] = findSimilar(index, 'lib1')
    expect(first.sharedWords.length + first.sharedTopics.length).toBeGreaterThan(0)
  })

  it('возвращает пустой список для проекта не из индекса', () => {
    expect(findSimilar(index, 'unknown')).toEqual([])
  })

  it('соблюдает ограничение на число результатов', () => {
    expect(findSimilar(index, 'lib1', 1).length).toBeLessThanOrEqual(1)
  })
})
