'use client'

import { useState } from 'react'
import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { DataTable } from '@/components/ui/DataTable'
import { cn, formatDateOnly, formatDateTime } from '@/lib/utils'
import type { Equipment, HistoryLog } from '@/types'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'borrowed' | 'activity'>('overview')
  const profile = useAppStore(s => s.profile)
  const equipment = useAppStore(s => s.equipment)
  const historyLogs = useAppStore(s => s.historyLogs)
  const borrowedItems = equipment.filter(e => e.status === 'Borrowed')

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

  const borrowedColumns = [
    { header: 'Equipment', accessor: 'base_name' as keyof Equipment },
    { header: 'Category', accessor: (row: Equipment) => row.category || '--' },
    { header: 'Location', accessor: (row: Equipment) => row.location || '--' },
    {
      header: 'Borrower',
      accessor: (row: Equipment) => row.borrower_name || row.borrower_username || '--',
    },
    {
      header: 'ID Number',
      accessor: (row: Equipment) => row.borrower_id_number || '--',
    },
    {
      header: 'Borrowed At',
      accessor: (row: Equipment) => row.borrow_time ? formatDateTime(row.borrow_time) : '--',
    },
    {
      header: 'Return By',
      accessor: (row: Equipment) => row.return_by_date ? formatDateOnly(row.return_by_date) : '--',
    },
    {
      header: 'Lender',
      accessor: (row: Equipment) => row.lender_username ? `@${row.lender_username}` : '--',
    },
    {
      header: 'Item Photo',
      accessor: (row: Equipment) => row.borrow_item_photo_url ? (
        <img
          src={row.borrow_item_photo_url}
          alt={`${row.base_name} item`}
          className="h-12 w-12 rounded border border-border object-cover"
        />
      ) : '--',
    },
    {
      header: 'Borrower Photo',
      accessor: (row: Equipment) => row.borrower_borrow_photo_url ? (
        <img
          src={row.borrower_borrow_photo_url}
          alt={`${row.borrower_name || row.borrower_username || 'Borrower'} photo`}
          className="h-12 w-12 rounded border border-border object-cover"
        />
      ) : '--',
    },
  ]

  const totalAvailable = equipment.filter(e => e.status === 'Available').length
  const totalBorrowed = equipment.filter(e => e.status === 'Borrowed').length
  const totalMaintenance = equipment.filter(e => e.status === 'Maintenance').length

  const tabs = [
    { key: 'overview', label: 'Overview', count: equipment.length },
    { key: 'borrowed', label: 'Borrowed Items', count: borrowedItems.length },
    { key: 'activity', label: 'Activity Log', count: historyLogs.length },
  ] as const

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(tab => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'rounded border px-4 py-2 text-sm font-bold font-mono transition-colors',
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {tab.label} ({tab.count})
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && (
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
      )}

      {activeTab === 'borrowed' && (
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-bold font-mono text-base">Borrowed Items</h3>
              <p className="mt-1 text-xs font-mono text-muted">
                Active borrowed records with borrower details, lender, borrow time, and return-by date.
              </p>
            </div>
            <p className="text-sm font-mono text-primary">
              {borrowedItems.length} active item{borrowedItems.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="mt-4">
            <DataTable
              columns={borrowedColumns}
              data={borrowedItems}
              emptyMessage="No active borrowed equipment."
            />
          </div>
        </Panel>
      )}

      {activeTab === 'activity' && (
        <Panel>
          <h3 className="font-bold font-mono text-base mb-3">Activity Log</h3>
          <DataTable
            columns={historyColumns}
            data={historyLogs}
            emptyMessage="No activity recorded yet."
          />
        </Panel>
      )}
    </>
  )
}
