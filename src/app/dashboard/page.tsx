'use client'

import { useState, useMemo } from 'react'
import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { QRReturnModal } from '@/components/modals/QRReturnModal'
import { formatDateTime } from '@/lib/utils'
import type { HistoryLog } from '@/types'
import Link from 'next/link'

export default function DashboardPage() {
  const profile = useAppStore(s => s.profile)
  const equipment = useAppStore(s => s.equipment)
  const historyLogs = useAppStore(s => s.historyLogs)
  const [qrOpen, setQrOpen] = useState(false)

  const isAdmin = profile?.role === 'admin'

  const pendingCount = useMemo(
    () => equipment.filter(e => e.status === 'Pending').length,
    [equipment]
  )

  const borrowedByMe = useMemo(
    () => equipment.filter(e => e.borrower_username === profile?.username && e.status === 'Borrowed'),
    [equipment, profile]
  )

  const historyColumns = [
    {
      header: 'Time',
      accessor: (row: HistoryLog) => (
        <span className="text-xs">{formatDateTime(row.created_at)}</span>
      ),
    },
    { header: 'User', accessor: 'username' as keyof HistoryLog },
    { header: 'Item', accessor: 'item' as keyof HistoryLog },
    { header: 'Event', accessor: 'event' as keyof HistoryLog },
  ]

  return (
    <>
      <QRReturnModal open={qrOpen} onClose={() => setQrOpen(false)} />

      {/* Return QR panel — students only */}
      {!isAdmin && (
        <Panel>
          <h3 className="text-success font-bold font-mono text-base mb-2">Return QR</h3>
          <p className="text-sm text-muted mb-3">
            Show this to Admin to return borrowed items.
            {borrowedByMe.length > 0 && (
              <span className="ml-2 font-bold text-gray-700">
                ({borrowedByMe.length} item{borrowedByMe.length !== 1 ? 's' : ''} borrowed)
              </span>
            )}
          </p>
          <Button
            variant="success"
            onClick={() => {
              if (borrowedByMe.length === 0) {
                alert('No active borrowed items.')
                return
              }
              setQrOpen(true)
            }}
          >
            GENERATE RETURN PASS
          </Button>
        </Panel>
      )}

      {/* Notifications panel */}
      <Panel>
        <div className="flex justify-between items-center">
          <h3 className="font-bold font-mono text-base">System Notifications</h3>
          {isAdmin && pendingCount > 0 && (
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                Pending Requests{' '}
                <span className="ml-1 bg-danger text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              </Button>
            </Link>
          )}
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
