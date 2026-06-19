'use client'

import Link from 'next/link'
import { Scan, Monitor } from 'lucide-react'

export function TopBar() {
  return (
    <div className="mb-6">
      <div className="mb-1 flex items-center gap-2">
        <Scan className="h-3.5 w-3.5 text-[#3B5BFF]" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#3B5BFF]">
          AISAT QR Monitoring
        </span>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 max-w-xl">
            Track equipment status, registrations, and pending returns that need action.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/tools"
            className="inline-flex items-center gap-2 rounded-lg bg-[#3B5BFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a4ae0] transition-colors"
          >
            <Monitor className="h-4 w-4" />
            Equipment
          </Link>
        </div>
      </div>
    </div>
  )
}
