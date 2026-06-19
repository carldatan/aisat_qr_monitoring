'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/contexts/store'
import { StatCard } from './StatCard'
import {
  Monitor,
  CheckCircle,
  Activity,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

const statConfigs = [
  { key: 'total', label: 'Total Equipment', caption: 'Current inventory', icon: Monitor, accent: 'blue' },
  { key: 'available', label: 'Available', caption: 'Ready to use', icon: CheckCircle, accent: 'green' },
  { key: 'inUse', label: 'In Use', caption: 'Checked out', icon: Activity, accent: 'purple' },
  { key: 'overdue', label: 'Overdue', caption: 'Past due return', icon: Clock, accent: 'orange' },
  { key: 'damaged', label: 'Damaged', caption: 'Needs repair', icon: AlertTriangle, accent: 'orange' },
  { key: 'lost', label: 'Lost', caption: 'Unaccounted', icon: XCircle, accent: 'red' },
] as const

export function StatCardRow() {
  const equipment = useAppStore(s => s.equipment)

  const counts = useMemo(() => {
    const now = new Date()
    const total = equipment.length
    const available = equipment.filter(e => e.status === 'Available').length
    const inUse = equipment.filter(e => e.status === 'Borrowed').length
    const overdue = equipment.filter(
      e => e.status === 'Borrowed' && e.return_by_date && new Date(e.return_by_date) < now
    ).length
    const damaged = equipment.filter(e => e.status === 'Maintenance').length
    const lost = equipment.filter(e => e.status === 'Lost').length
    return { total, available, inUse, overdue, damaged, lost }
  }, [equipment])

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {statConfigs.map(cfg => (
        <StatCard
          key={cfg.key}
          label={cfg.label}
          value={counts[cfg.key]}
          caption={cfg.caption}
          icon={cfg.icon}
          accentClass={cfg.accent}
        />
      ))}
    </div>
  )
}
