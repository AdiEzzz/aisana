import crypto from 'crypto'

/** В базе храним только sha256 токена: утечка дампа не даёт токенов сессий. */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}