/**
 * Приведение внешней ссылки к форме, которую можно показать в <iframe>.
 *
 * Google Диск отдаёт страницу /view с заголовком X-Frame-Options: SAMEORIGIN —
 * браузер отказывается рисовать её внутри нашего фрейма, и вместо документа
 * видна заглушка «Нет доступа», даже когда файл открыт по ссылке для всех.
 * Встраиваемая форма той же ссылки — /preview, на ней этого заголовка нет.
 *
 * Ссылки, для которых правила нет (наш Blob, сторонние сайты), возвращаются
 * как есть.
 */

const DRIVE_FILE = /^https?:\/\/drive\.google\.com\/file\/d\/([\w-]+)/i
const DRIVE_OPEN = /^https?:\/\/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/i
const DOCS_EDITOR = /^https?:\/\/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([\w-]+)/i

/**
 * Готовый src для <iframe>.
 *
 * pdfOptions — параметры встроенного в браузер просмотрщика PDF (#toolbar=1
 * и подобные). Они добавляются только к прямым ссылкам на файл: просмотрщику
 * Google они не нужны и он их игнорирует.
 */
export function toEmbedUrl(url: string, pdfOptions = ''): string {
  const trimmed = (url || '').trim()
  if (!trimmed) return trimmed

  const driveFile = trimmed.match(DRIVE_FILE)
  if (driveFile) return `https://drive.google.com/file/d/${driveFile[1]}/preview`

  const driveOpen = trimmed.match(DRIVE_OPEN)
  if (driveOpen) return `https://drive.google.com/file/d/${driveOpen[1]}/preview`

  const docs = trimmed.match(DOCS_EDITOR)
  if (docs) return `https://docs.google.com/${docs[1]}/d/${docs[2]}/preview`

  return `${trimmed}${pdfOptions}`
}
