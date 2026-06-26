'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { DataTable } from '@/components/ui/DataTable'
import { formatDateOnly, formatDateTime } from '@/lib/utils'
import { isPrivilegedRole } from '@/lib/roles'
import type { Equipment } from '@/types'

export default function BorrowedPage() {
  const router = useRouter()
  const profile = useAppStore(s => s.profile)
  const equipment = useAppStore(s => s.equipment)
  const loadPageData = useAppStore(s => s.loadPageData)

  useEffect(() => {
    loadPageData('admin')
  }, [loadPageData])

  useEffect(() => {
    if (profile && !isPrivilegedRole(profile.role)) {
      router.replace('/dashboard')
    }
  }, [profile, router])

  const borrowedItems = useMemo(
    () => equipment.filter(e => e.status === 'Borrowed'),
    [equipment]
  )

  return (
    <Panel>
      <h3 className="mb-3 flex items-center gap-2 font-bold font-mono text-lg">
        <BookOpen className="h-5 w-5 text-primary" />
        Borrowed Equipment
      </h3>
      <DataTable
        columns={[
          { header: 'Equipment', accessor: 'base_name' as keyof Equipment },
          {
            header: 'Borrower',
            accessor: (row: Equipment) => row.borrower_name || row.borrower_username || '--',
          },
          {
            header: 'ID Number',
            accessor: (row: Equipment) => row.borrower_id_number || '--',
          },
          {
            header: 'Borrow Date',
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
        ]}
        data={borrowedItems}
        emptyMessage="No active borrowed equipment."
      />
    </Panel>
  )
}
