import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {}

export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'border border-border rounded-xl bg-white p-6 shadow-panel mb-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
