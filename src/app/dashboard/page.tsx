import { TopBar } from '@/components/admin/TopBar'
import { StatCardRow } from '@/components/admin/StatCardRow'
import { AttentionPanel } from '@/components/admin/AttentionPanel'
import { ScanActivityPanel } from '@/components/admin/ScanActivityPanel'

export default function DashboardPage() {
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
