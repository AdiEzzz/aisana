import { unlink } from 'fs/promises'
import path from 'path'

/**
 * Удаляет локально загруженный файл (url вида /uploads/xxx.pdf) с диска.
 * Внешние ссылки (http/https) игнорирует.
 * path.basename защищает от path traversal (../../etc/passwd не пройдёт).
 * Ошибки не выбрасывает: отсутствие файла на диске не должно ломать API-ответ.
 */
export async function deleteLocalUpload(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith('/uploads/')) return

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
