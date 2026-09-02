import { del } from '@vercel/blob'
import { unlink } from 'fs/promises'
import path from 'path'

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

/** Публичные ссылки Blob всегда живут на этом домене. */
const BLOB_HOST = '.blob.vercel-storage.com'

/**
 * Удаляет ранее загруженный файл.
 *
 * Понимает две формы: ссылку на Vercel Blob (текущее хранилище) и старый
 * локальный путь /uploads/xxx.pdf — такие записи остались в базе от версии,
 * которая писала файлы на диск. Внешние ссылки (Google Drive и прочее)
 * не трогает: ими мы не владеем.
 *
 * Ошибки не выбрасывает: отсутствие файла не должно ломать API-ответ.
 */
export async function deleteUpload(url: string | null | undefined): Promise<void> {
  if (!url) return

  if (url.includes(BLOB_HOST)) {
    try {
      await del(url, { storeId: BLOB_STORE_ID })
    } catch (error) {
      console.error(`Failed to delete blob ${url}:`, error)
    }
    return
  }

  if (!url.startsWith('/uploads/')) return

  // path.basename защищает от path traversal (../../etc/passwd не пройдёт).
  const filename = path.basename(url)
  if (!filename) return

  const filepath = path.join(process.cwd(), 'public', 'uploads', filename)
  try {
    await unlink(filepath)
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error(`Failed to delete upload ${filepath}:`, error)
    }
  }
}
