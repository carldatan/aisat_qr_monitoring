'use client'

import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { DataTable } from '@/components/ui/DataTable'
import { formatDateTime } from '@/lib/utils'
import { isPrivilegedRole } from '@/lib/roles'
import type { ScannedLibrary } from '@/types'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LibraryPage() {
  const profile = useAppStore(s => s.profile)
  const scannedLibrary = useAppStore(s => s.scannedLibrary)
  const router = useRouter()

  useEffect(() => {
    if (profile && !isPrivilegedRole(profile.role)) router.replace('/dashboard')
  }, [profile, router])

  const columns = [
    {
      header: 'Scan Time',
      accessor: (row: ScannedLibrary) => (
        <span className="text-xs">{formatDateTime(row.scan_time)}</span>
      ),
    },
    { header: 'Student Name', accessor: 'student_name' as keyof ScannedLibrary },
    { header: 'ID Number', accessor: 'student_id_number' as keyof ScannedLibrary },
    { header: 'Items Returned', accessor: 'items_count' as keyof ScannedLibrary },
    {
      header: 'Processed By',
      accessor: (row: ScannedLibrary) => (
        <span className="text-muted">@{row.processed_by ?? 'admin'}</span>
      ),
    },
  ]

  return (
    <Panel>
      <h3 className="font-bold font-mono text-base text-muted mb-1">
        QR Scanned Pass Library
      </h3>
      <p className="text-xs text-muted mb-4">
        Permanent record of all validated return passes.
      </p>
      <DataTable
        columns={columns}
        data={scannedLibrary}
        emptyMessage="No scanned passes recorded yet."
      />
    </Panel>
  )
}
