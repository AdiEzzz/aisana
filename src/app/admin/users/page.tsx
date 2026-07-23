export const dynamic = 'force-dynamic'

import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { UserCreateForm } from '@/components/users/UserCreateForm'
import { UserEditControls } from '@/components/users/UserEditControls'

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  EDITOR: 'Редактор',
  UNIVERSITY_REP: 'Представитель вуза',
  VIEWER: 'Просмотр',
}

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  EDITOR: 'bg-blue-100 text-blue-700',
  UNIVERSITY_REP: 'bg-violet-100 text-violet-700',
  VIEWER: 'bg-slate-100 text-slate-600',
}

export default async function AdminUsersPage() {
  const currentUser = await requireRole([UserRole.ADMIN], '/admin/users')

  const [users, universities] = await Promise.all([
    prisma.user.findMany({
      include: { university: { select: { name: true, shortName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.university.findMany({
      select: { id: true, name: true, shortName: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const adminCount = users.filter(u => u.role === UserRole.ADMIN).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Пользователи</h1>
        <p className="mt-1 text-sm text-slate-500">
          Аккаунты для администраторов, редакторов и представителей вузов.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Новый пользователь</h2>
        <UserCreateForm universities={universities} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Пользователь</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Роль</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Вуз</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{user.name || '—'}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                  {user.id === currentUser.id && (
                    <span className="ml-2 text-[10px] text-slate-400 font-medium">(вы)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {user.university ? (user.university.shortName || user.university.name) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <UserEditControls
                    user={{ id: user.id, name: user.name, email: user.email, role: user.role, universityId: user.universityId }}
                    universities={universities}
                    isSelf={user.id === currentUser.id}
                    isLastAdmin={user.role === UserRole.ADMIN && adminCount <= 1}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="py-12 text-center text-slate-400">Нет пользователей</div>
        )}
      </div>
    </div>
  )
}
