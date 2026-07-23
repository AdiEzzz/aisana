import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ProjectStatus, ProjectCategory } from '@prisma/client'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  IDEA: { label: 'Идея', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  PROTOTYPE: { label: 'Прототип', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  PILOT: { label: 'Пилот', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  IMPLEMENTED: { label: 'Внедрено', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  SCALED: { label: 'Масштабировано', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
}

export const CATEGORY_CONFIG: Record<ProjectCategory, { label: string; color: string; icon: string }> = {
  EDUCATION: { label: 'Образование', color: '#3b82f6', icon: '🎓' },
  SCIENCE: { label: 'Наука', color: '#8b5cf6', icon: '🔬' },
  MANAGEMENT: { label: 'Управление', color: '#f59e0b', icon: '📊' },
  ANALYTICS: { label: 'Аналитика', color: '#10b981', icon: '📈' },
  GENERATIVE_AI: { label: 'Генеративный ИИ', color: '#ec4899', icon: '🤖' },
  COMPUTER_VISION: { label: 'Компьютерное зрение', color: '#14b8a6', icon: '👁' },
  ROBOTICS: { label: 'Робототехника', color: '#f97316', icon: '⚙️' },
}
