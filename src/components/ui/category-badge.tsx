import { ProjectCategory } from '@prisma/client'
import { CATEGORY_CONFIG } from '@/lib/utils'

interface Props {
  category: ProjectCategory
}

export function CategoryBadge({ category }: Props) {
  const config = CATEGORY_CONFIG[category]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white"
      style={{ backgroundColor: config.color }}
    >
      {config.icon} {config.label}
    </span>
  )
}
