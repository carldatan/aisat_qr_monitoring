import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatDateTime(iso: string): string {
	try {
		return format(new Date(iso), 'MM/dd/yyyy, hh:mm:ss a')
	} catch {
		return iso
	}
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
	return arr.reduce((acc, item) => {
		const k = key(item)
		acc[k] = acc[k] ? [...acc[k], item] : [item]
		return acc
	}, {} as Record<string, T[]>)
}
