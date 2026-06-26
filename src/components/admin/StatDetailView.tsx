'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useAppStore } from '@/contexts/store'
import { DataTable } from '@/components/ui/DataTable'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn, formatDateOnly, formatDateTime } from '@/lib/utils'
import type { Equipment } from '@/types'
import { ArrowLeft, Monitor, CheckCircle, Activity, Clock, AlertTriangle, XCircle } from 'lucide-react'

export type DashboardStatKey =
  | 'total'
  | 'available'
  | 'in-use'
  | 'overdue'
  | 'damaged'
  | 'lost'

const statMeta: Record<
  DashboardStatKey,
  {
    title: string
    description: string
    accentClass: string
    icon: typeof Monitor
  }
> = {
  total: {
    title: 'Total Equipment',
    description: 'All tracked equipment in inventory.',
    accentClass: 'blue',
    icon: Monitor,
  },
  available: {
    title: 'Available Equipment',
    description: 'Equipment ready to borrow.',
    accentClass: 'green',
    icon: CheckCircle,
  },
  'in-use': {
    title: 'Equipment In Use',
    description: 'Currently checked out by users.',
    accentClass: 'purple',
    icon: Activity,
  },
  overdue: {
    title: 'Overdue Equipment',
    description: 'Borrowed items past their return date.',
    accentClass: 'orange',
    icon: Clock,
  },
  damaged: {
    title: 'Damaged Equipment',
    description: 'Items marked for maintenance or repair.',
    accentClass: 'orange',
    icon: AlertTriangle,
  },
  lost: {
    title: 'Lost Equipment',
    description: 'Items currently marked as lost.',
    accentClass: 'red',
    icon: XCircle,
  },
}

function isOverdue(equipment: Equipment) {
  return (
    equipment.status === 'Borrowed' &&
    Boolean(equipment.return_by_date) &&
    new Date(equipment.return_by_date as string) < new Date()
  )
}

function matchesStat(stat: DashboardStatKey, equipment: Equipment) {
  switch (stat) {
    case 'total':
      return true
    case 'available':
      return equipment.status === 'Available'
    case 'in-use':
      return equipment.status === 'Borrowed'
    case 'overdue':
      return isOverdue(equipment)
    case 'damaged':
      return equipment.status === 'Maintenance'
    case 'lost':
      return equipment.status === 'Lost'
  }
}

function StatIcon({ stat }: { stat: DashboardStatKey }) {
  const Icon = statMeta[stat].icon
  return <Icon className="h-4 w-4" />
}

export function StatDetailView({ stat }: { stat: DashboardStatKey }) {
  const equipment = useAppStore(s => s.equipment)
  const fetchState = useAppStore(s => s.fetchState)

  const loading = fetchState.equipment === 0

  const { title, description, accentClass } = statMeta[stat]

  const rows = useMemo(
    () =>
      equipment
        .filter(item => matchesStat(stat, item))
        .sort((a, b) => a.base_name.localeCompare(b.base_name)),
    [equipment, stat]
  )

  const columns = [
    { header: 'Item', accessor: 'base_name' as keyof Equipment },
    {
      header: 'Status',
      accessor: (row: Equipment) =>
        isOverdue(row) ? (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-bold font-mono text-amber-700">
            Overdue
          </span>
        ) : (
          <StatusBadge status={row.status} />
        ),
    },
    { header: 'Category', accessor: (row: Equipment) => row.category || 'Uncategorized' },
    { header: 'Location', accessor: (row: Equipment) => row.location || 'Unassigned' },
    {
      header: 'Borrower',
      accessor: (row: Equipment) =>
        row.borrower_name || row.borrower_username ? (
          <div className="leading-tight">
            <div>{row.borrower_name || 'Unknown borrower'}</div>
            <div className="text-xs text-muted">@{row.borrower_username || 'n/a'}</div>
          </div>
        ) : (
          '—'
        ),
    },
    {
      header: 'Due Date',
      accessor: (row: Equipment) => (row.return_by_date ? formatDateOnly(row.return_by_date) : '—'),
    },
    {
      header: 'Updated',
      accessor: (row: Equipment) => formatDateTime(row.updated_at),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                {
                  blue: 'bg-blue-100 text-blue-600',
                  green: 'bg-emerald-100 text-emerald-600',
                  purple: 'bg-purple-100 text-purple-600',
                  orange: 'bg-orange-100 text-orange-600',
                  red: 'bg-rose-100 text-rose-600',
                }[accentClass]
              )}
            >
              <StatIcon stat={stat} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#3B5BFF]">
              AISAT QR Monitoring
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/tools"
            className="inline-flex items-center gap-2 rounded-lg bg-[#3B5BFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a4ae0]"
          >
            <Monitor className="h-4 w-4" />
            Equipment
          </Link>
        </div>
      </div>

      <Panel className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Summary</p>
            <p className="text-sm text-gray-500">
              {rows.length} matching item{rows.length === 1 ? '' : 's'} out of {equipment.length} total.
            </p>
          </div>
          <p className="text-xs uppercase tracking-widest text-gray-400">
            {loading ? 'Refreshing data' : 'Current snapshot'}
          </p>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          emptyMessage={`No equipment found for ${title.toLowerCase()}.`}
        />
      </Panel>
    </div>
  )
}
