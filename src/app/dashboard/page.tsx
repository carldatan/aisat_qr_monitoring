'use client'

import { useState } from 'react'
import {
	Activity,
	BookOpen,
	Clock3,
	LayoutDashboard,
	Package2,
	ShieldCheck,
	Users,
} from 'lucide-react'
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
    { key: 'overview', label: 'Overview', count: equipment.length, icon: LayoutDashboard },
    { key: 'borrowed', label: 'Borrowed Items', count: borrowedItems.length, icon: Package2 },
    { key: 'activity', label: 'Activity Log', count: historyLogs.length, icon: Activity },
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
                'flex items-center gap-2 rounded border px-4 py-2 text-sm font-bold font-mono transition-colors',
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label} ({tab.count})
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && (
        <Panel>
          <h3 className="mb-3 flex items-center gap-2 font-bold font-mono text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            System Summary
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface/50 p-4">
              <div className="flex items-center gap-2 text-muted">
                <BookOpen className="h-5 w-5 text-success" />
                <p className="text-sm font-mono">Available</p>
              </div>
              <p className="mt-2 text-3xl font-bold font-mono text-success">{totalAvailable}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/50 p-4">
              <div className="flex items-center gap-2 text-muted">
                <Users className="h-5 w-5 text-primary" />
                <p className="text-sm font-mono">Borrowed</p>
              </div>
              <p className="mt-2 text-3xl font-bold font-mono text-primary">{totalBorrowed}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/50 p-4">
              <div className="flex items-center gap-2 text-muted">
                <Clock3 className="h-5 w-5 text-danger" />
                <p className="text-sm font-mono">Maintenance</p>
              </div>
              <p className="mt-2 text-3xl font-bold font-mono text-danger">{totalMaintenance}</p>
            </div>
          </div>
          <p className="mt-3 text-base text-primary font-mono">
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
              <h3 className="flex items-center gap-2 font-bold font-mono text-lg">
                <Package2 className="h-5 w-5 text-primary" />
                Borrowed Items
              </h3>
              <p className="mt-1 text-base font-mono text-muted">
                Active borrowed records with borrower details, lender, borrow time, and return-by date.
              </p>
            </div>
            <p className="text-base font-mono text-primary">
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
          <h3 className="mb-3 flex items-center gap-2 font-bold font-mono text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Activity Log
          </h3>
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
