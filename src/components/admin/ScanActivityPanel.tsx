'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useAppStore } from '@/contexts/store'
import { User, Clock } from 'lucide-react'

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  Returned: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Returned',
  },
  Borrowed: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Checked Out',
  },
  overdue: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'Overdue',
  },
}

function getRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return iso
  }
}

export function ScanActivityPanel() {
  const historyLogs = useAppStore(s => s.historyLogs)
  const equipment = useAppStore(s => s.equipment)

  const recentScans = useMemo(() => {
    const eqMap = new Map(equipment.map(e => [e.id, e]))

    return historyLogs
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4)
      .map(log => {
        const isOverdue = (() => {
          const eq = Array.from(eqMap.values()).find(
            e => e.borrower_username === log.username && e.status === 'Borrowed'
          )
          if (eq && eq.return_by_date && new Date(eq.return_by_date) < new Date()) return true
          return false
        })()

        let statusKey = log.event === 'Returned' ? 'Returned' : log.event === 'Borrowed' ? 'Borrowed' : log.event
        if (statusKey === 'Borrowed' && isOverdue) statusKey = 'overdue'

        const style = statusStyles[statusKey] ?? statusStyles.Borrowed

        return {
          equipmentLabel: log.item,
          scannedBy: log.username,
          description: log.description || '',
          createdAt: log.created_at,
          statusKey,
          style,
        }
      })
  }, [historyLogs, equipment])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Recent Scan Activity</h2>
        <Link
          href="/admin/logs"
          className="text-sm font-semibold text-[#3B5BFF] hover:underline"
        >
          View All Logs
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {recentScans.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No scan activity yet.</p>
        ) : (
          recentScans.map((scan, i) => (
            <div key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {scan.equipmentLabel}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 truncate">
                  Scanned by {scan.scannedBy}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {scan.scannedBy}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getRelativeTime(scan.createdAt)}
                  </span>
                </div>
                <span
                  className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${scan.style.bg} ${scan.style.text}`}
                >
                  {scan.style.label}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${scan.style.bg} ${scan.style.text}`}
              >
                {scan.style.label}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
