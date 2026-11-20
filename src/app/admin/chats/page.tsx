import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { ConversationList } from '@/components/business/Conversations'

export const dynamic = 'force-dynamic'

export default async function ChatsPage() {
  const user = await requireRole([UserRole.UNIVERSITY_REP, UserRole.ADMIN, UserRole.EDITOR], '/admin/chats')

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Диалоги</h1>
      <p className="mb-5 text-sm text-slate-500">Переписка с партнёрами по проектам вуза и их задачам.</p>
      <ConversationList user={user} basePath="/admin/chats" />
    </div>
  )
}
