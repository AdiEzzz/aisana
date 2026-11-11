import { del } from '@vercel/blob'
import path from 'path'
import { prisma } from '@/lib/prisma'

/**
 * Идентификатор Blob-хранилища. Vercel подставляет переменную сам, когда store
 * подключён к проекту; вместе с VERCEL_OIDC_TOKEN этого достаточно для доступа,
 * отдельный BLOB_READ_WRITE_TOKEN заводить не нужно.
 */
export const BLOB_STORE_ID = process.env.BLOB_READ_WRITE_TOKEN_STORE_ID

/**
 * Предел размера загружаемого PDF.
 *
 * Ограничение не наше: тело запроса к serverless-функции на Vercel не может
 * быть больше 4.5 МБ, дальше платформа отвечает 413 ещё до нашего кода.
 * Берём с запасом. Чтобы принимать файлы крупнее, заливать нужно прямо
 * в Blob с клиента (@vercel/blob/client), минуя функцию.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/** Каталог внутри Blob-хранилища, куда складываются загруженные PDF. */
export const BLOB_PREFIX = 'uploads'

/**
 * Удаляет ранее загруженный файл из Blob-хранилища.
 *
 * Реагирует только на наши собственные ссылки вида /uploads/xxx.pdf.
 * Внешние (Google Диск и прочее) не трогает: ими мы не владеем.
 *
 * Файл может быть привязан к нескольким проектам (в project_files нет
 * уникальности на url). Поэтому перед удалением проверяем, не остался ли он
 * у другого проекта: иначе удаление из одного проекта ломает ссылку в
 * остальных.
 *
 * Ошибки не выбрасывает: отсутствие файла не должно ломать API-ответ.
 * Записи, оставшиеся от версии, которая писала файлы на диск, в хранилище
 * не найдутся — это ожидаемо и просто попадёт в лог.
 */
export async function deleteUpload(
  url: string | null | undefined,
  options: { exceptProjectId?: string } = {}
): Promise<void> {
  if (!url || !url.startsWith('/uploads/')) return

  // path.basename защищает от path traversal (../../etc/passwd не пройдёт).
  const filename = path.basename(url)
  if (!filename) return

  // Файл ещё нужен другому проекту — не удаляем. Проверяем и вкладку
  // «Файлы и ссылки», и паспорт проекта: ссылка может жить в обоих.
  try {
    const except = options.exceptProjectId
    const [asFile, asPassport] = await Promise.all([
      prisma.projectFile.count({
        where: { url, ...(except ? { projectId: { not: except } } : {}) },
      }),
      prisma.project.count({
        where: { agentPassportPdf: url, ...(except ? { id: { not: except } } : {}) },
      }),
    ])
    if (asFile > 0 || asPassport > 0) return
  } catch (error) {
    // Не смогли проверить — лучше не удалять, чтобы не оставить битую ссылку
    console.error(`Failed to check upload usage for ${filename}`, error)
    return
  }

  try {
    await del(`${BLOB_PREFIX}/${filename}`, { storeId: BLOB_STORE_ID })
  } catch (error) {
    console.error(`Failed to delete upload ${filename}:`, error)
  }
}
