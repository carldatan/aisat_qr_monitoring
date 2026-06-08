'use client'

import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { DataTable } from '@/components/ui/DataTable'
import { formatDateTime } from '@/lib/utils'
import type { HistoryLog } from '@/types'

export default function DashboardPage() {
  const profile = useAppStore(s => s.profile)
  const equipment = useAppStore(s => s.equipment)
  const historyLogs = useAppStore(s => s.historyLogs)

  const historyColumns = [
    {
      header: 'Time',
      accessor: (row: HistoryLog) => (
        <span className="text-xs">{formatDateTime(row.created_at)}</span>
      ),
    },
    { header: 'Borrower ID', accessor: 'username' as keyof HistoryLog },
    { header: 'Item', accessor: 'item' as keyof HistoryLog },
    { header: 'Event', accessor: 'event' as keyof HistoryLog },
    {
      header: 'Description',
      accessor: (row: HistoryLog) => row.description || '--',
    },
    {
      header: 'Photos',
      accessor: (row: HistoryLog) => (
        <div className="flex gap-2">
          {row.item_photo_url && (
            <img
              src={row.item_photo_url}
              alt="Item"
              className="h-12 w-12 rounded border border-border object-cover"
            />
          )}
          {row.borrower_photo_url && (
            <img
              src={row.borrower_photo_url}
              alt="Borrower"
              className="h-12 w-12 rounded border border-border object-cover"
            />
          )}
          {!row.item_photo_url && !row.borrower_photo_url && '--'}
        </div>
      ),
    },
  ]

  const totalAvailable = equipment.filter(e => e.status === 'Available').length
  const totalBorrowed = equipment.filter(e => e.status === 'Borrowed').length
  const totalMaintenance = equipment.filter(e => e.status === 'Maintenance').length

  return (
    <>
      <Panel>
        <h3 className="font-bold font-mono text-base">System Summary</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded border border-border p-4">
            <p className="text-xs font-mono text-muted">Available</p>
            <p className="text-2xl font-bold font-mono text-success">{totalAvailable}</p>
          </div>
          <div className="rounded border border-border p-4">
            <p className="text-xs font-mono text-muted">Borrowed</p>
            <p className="text-2xl font-bold font-mono text-primary">{totalBorrowed}</p>
          </div>
          <div className="rounded border border-border p-4">
            <p className="text-xs font-mono text-muted">Maintenance</p>
            <p className="text-2xl font-bold font-mono text-danger">{totalMaintenance}</p>
          </div>
        </div>
        <p className="text-sm text-primary font-mono mt-2">
          Status: Authenticated as{' '}
          <span className="font-bold">{profile?.full_name}</span>{' '}
          <span className="text-muted">({profile?.role})</span>
        </p>
      </Panel>

      {/* Activity log */}
      <Panel>
        <h3 className="font-bold font-mono text-base mb-3">Activity Log</h3>
        <DataTable
          columns={historyColumns}
          data={historyLogs}
          emptyMessage="No activity recorded yet."
        />
      </Panel>
    </>
  )
}
