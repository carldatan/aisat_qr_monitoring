'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/contexts/store'
import { cn } from '@/lib/utils'

interface AttentionRowProps {
  variant: 'warning' | 'alert'
  title: string
  description: string
  linkLabel: string
  href: string
}

function AttentionRow({
  variant,
  title,
  description,
  linkLabel,
  href,
}: AttentionRowProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-lg px-4 py-3',
        variant === 'warning' ? 'bg-amber-50' : 'bg-rose-50'
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            'text-sm font-semibold',
            variant === 'warning' ? 'text-amber-900' : 'text-rose-900'
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            'mt-0.5 text-xs',
            variant === 'warning' ? 'text-amber-700' : 'text-rose-700'
          )}
        >
          {description}
        </p>
      </div>
      <Link
        href={href}
        className="shrink-0 text-xs font-semibold text-[#3B5BFF] hover:underline pt-0.5"
      >
        {linkLabel}
      </Link>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-gray-50 px-4 py-3 animate-pulse">
      <div className="flex-1">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="mt-1.5 h-3 w-36 bg-gray-200 rounded" />
      </div>
      <div className="h-3 w-16 bg-gray-200 rounded" />
    </div>
  )
}

export function AttentionPanel() {
  const equipment = useAppStore(s => s.equipment)
  const historyLogs = useAppStore(s => s.historyLogs)
  const fetchState = useAppStore(s => s.fetchState)

  const equipmentLoaded = fetchState.equipment !== 0
  const historyLoaded = fetchState.historyLogs !== 0

  const rows = useMemo(() => {
    const now = new Date()
    const result: AttentionRowProps[] = []

    if (equipmentLoaded) {
      const overdueCount = equipment.filter(
        e => e.status === 'Borrowed' && e.return_by_date && new Date(e.return_by_date) < now
      ).length

      const pendingCount = equipment.filter(
        e => e.status === 'Pending'
      ).length

      if (overdueCount > 0) {
        result.push({
          variant: 'warning',
          title: `${overdueCount} item${overdueCount === 1 ? '' : 's'} overdue for return`,
          description: 'Past due date — please follow up with the borrower.',
          linkLabel: 'Equipment',
          href: '/admin/tools',
        })
      }

      if (pendingCount > 0) {
        result.push({
          variant: 'warning',
          title: `${pendingCount} item${pendingCount === 1 ? '' : 's'} pending registration`,
          description: 'Awaiting QR assignment or status update.',
          linkLabel: 'Equipment',
          href: '/admin/tools',
        })
      }
    }

    if (historyLoaded) {
      const recentFlagged = historyLogs.filter(
        log => log.event === 'Borrowed'
      ).length

      if (recentFlagged > 0) {
        result.push({
          variant: 'alert',
          title: `${recentFlagged} recent checkout${recentFlagged === 1 ? '' : 's'} recorded`,
          description: 'Items currently checked out and in use.',
          linkLabel: 'Logs',
          href: '/admin/logs',
        })
      }
    }

    return result
  }, [equipment, historyLogs, equipmentLoaded, historyLoaded])

  if (!equipmentLoaded && !historyLoaded) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Needs Attention</h2>
          <span className="text-sm font-semibold text-[#3B5BFF]">Loading...</span>
        </div>
        <div className="space-y-2">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    )
  }

  if (rows.length === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Needs Attention</h2>
        <span className="text-sm font-semibold text-[#3B5BFF]">
          {rows.length} item{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <AttentionRow key={i} {...row} />
        ))}
      </div>
    </div>
  )
}
