'use client'

import { useEffect } from 'react'
import { TopBar } from '@/components/admin/TopBar'
import { StatCardRow } from '@/components/admin/StatCardRow'
import { AttentionPanel } from '@/components/admin/AttentionPanel'
import { ScanActivityPanel } from '@/components/admin/ScanActivityPanel'
import { useAppStore } from '@/contexts/store'

export default function DashboardPage() {
  const loadPageData = useAppStore(s => s.loadPageData)

  useEffect(() => {
    loadPageData('dashboard')
  }, [loadPageData])

  return (
    <>
      <TopBar />
      <div className="space-y-6">
        <StatCardRow />
        <AttentionPanel />
        <ScanActivityPanel />
      </div>
    </>
  )
}
