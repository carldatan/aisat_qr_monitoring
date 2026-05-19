import { cn } from '@/lib/utils'

interface BadgeProps {
  count: number
  className?: string
}

export function Badge({ count, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'bg-danger text-white px-2 py-0.5 rounded-full text-xs font-bold ml-1',
        className
      )}
    >
      {count}
    </span>
  )
}
