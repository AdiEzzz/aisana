import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { ConversationView } from '@/components/business/Conversations'

export const dynamic = 'force-dynamic'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole([UserRole.UNIVERSITY_REP, UserRole.ADMIN, UserRole.EDITOR], '/admin/chats')
  const { id } = await params

  return <ConversationView user={user} id={id} basePath="/admin/chats" />
}
