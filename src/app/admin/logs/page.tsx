'use client'

import { useMemo, useState } from 'react'
import { useAppStore } from '@/contexts/store'
import { formatDateTime } from '@/lib/utils'
import { Activity, Search, Filter } from 'lucide-react'

const eventStyles: Record<string, { bg: string; text: string }> = {
  Borrowed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Returned: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
}

function EventBadge({ event }: { event: string }) {
  const style = eventStyles[event] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
      {event}
    </span>
  )
}

export default function LogsPage() {
  const historyLogs = useAppStore(s => s.historyLogs)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const events = useMemo(() => {
    const set = new Set(historyLogs.map(l => l.event))
    return Array.from(set).sort()
  }, [historyLogs])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return historyLogs.filter(log => {
      if (eventFilter && log.event !== eventFilter) return false
      if (!q) return true
      return (
        log.username.toLowerCase().includes(q) ||
        log.item.toLowerCase().includes(q) ||
        (log.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [historyLogs, search, eventFilter])

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-[#3B5BFF]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#3B5BFF]">
            AISAT QR Monitoring
          </span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Activity Logs</h1>
            <p className="mt-1 text-sm text-gray-500">
              All transactions, equipment changes, and account activities.
            </p>
          </div>
          <p className="text-sm text-gray-500 shrink-0">
            {filtered.length} of {historyLogs.length} records
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-5 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, item, or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B5BFF]/20 focus:border-[#3B5BFF]"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              {eventFilter || 'All events'}
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => { setEventFilter(''); setFilterOpen(false) }}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${!eventFilter ? 'font-semibold text-[#3B5BFF]' : 'text-gray-700'}`}
                  >
                    All events
                  </button>
                  {events.map(e => (
                    <button
                      key={e}
                      onClick={() => { setEventFilter(e); setFilterOpen(false) }}
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${eventFilter === e ? 'font-semibold text-[#3B5BFF]' : 'text-gray-700'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Photos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                    {search || eventFilter ? 'No logs match your filters.' : 'No activity recorded yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((log, i) => (
                  <tr key={log.id ?? i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <EventBadge event={log.event} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {log.username}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                      {log.item}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 max-w-[300px]">
                      <span className="line-clamp-2">{log.description || '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        {log.item_photo_url ? (
                          <img
                            src={log.item_photo_url}
                            alt="Item"
                            className="h-10 w-10 rounded-lg border border-gray-200 object-cover"
                          />
                        ) : null}
                        {log.borrower_photo_url ? (
                          <img
                            src={log.borrower_photo_url}
                            alt="Borrower"
                            className="h-10 w-10 rounded-lg border border-gray-200 object-cover"
                          />
                        ) : null}
                        {!log.item_photo_url && !log.borrower_photo_url && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
