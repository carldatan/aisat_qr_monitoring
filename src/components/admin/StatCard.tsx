import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  caption: string
  icon: LucideIcon
  accentClass: string
  href?: string
}

const accentBgMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-rose-100 text-rose-600',
}

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  accentClass,
  href,
}: StatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            accentBgMap[accentClass] ?? 'bg-gray-100 text-gray-600'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-gray-400 truncate">{caption}</p>
    </>
  )

  const baseClassName =
    'group flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-w-0 transition-all duration-200'

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          baseClassName,
          'cursor-pointer hover:-translate-y-0.5 hover:border-[#3B5BFF]/25 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B5BFF]/20'
        )}
      >
        {content}
      </Link>
    )
  }

  return <div className={baseClassName}>{content}</div>
}
