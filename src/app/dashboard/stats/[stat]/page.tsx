import { notFound } from 'next/navigation'
import { StatDetailView, type DashboardStatKey } from '@/components/admin/StatDetailView'

const validStats: DashboardStatKey[] = ['total', 'available', 'in-use', 'overdue', 'damaged', 'lost']

export default function DashboardStatPage({
  params,
}: {
  params: { stat: string }
}) {
  if (!validStats.includes(params.stat as DashboardStatKey)) {
    notFound()
  }

  return <StatDetailView stat={params.stat as DashboardStatKey} />
}
