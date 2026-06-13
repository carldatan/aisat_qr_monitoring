import { cn } from '@/lib/utils'

type StatusBadgeProps = {
	status: string
	className?: string
}

const STATUS_STYLES: Record<string, string> = {
	Available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
	Borrowed: 'bg-blue-100 text-blue-700 border-blue-200',
	Pending: 'bg-amber-100 text-amber-700 border-amber-200',
	Maintenance: 'bg-orange-100 text-orange-700 border-orange-200',
	Lost: 'bg-rose-100 text-rose-700 border-rose-200',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold font-mono',
				STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700 border-gray-200',
				className
			)}
		>
			{status}
		</span>
	)
}
