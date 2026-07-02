'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChartColumn, Package2 } from 'lucide-react'
import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { addEquipmentBatch } from '@/lib/db'
import { isPrivilegedRole } from '@/lib/roles'
import { EQUIPMENT_STATUSES, type InventoryGroup } from '@/lib/equipment'
import type { EquipmentStatus } from '@/types'

export default function InventoryPage() {
  const router = useRouter()
  const profile = useAppStore(s => s.profile)
  const equipment = useAppStore(s => s.equipment)
  const loadPageData = useAppStore(s => s.loadPageData)
  const refreshAll = useAppStore(s => s.refreshAll)

  const [eqName, setEqName] = useState('')
  const [eqQty, setEqQty] = useState('')
  const [eqCategory, setEqCategory] = useState('')
  const [eqLocation, setEqLocation] = useState('')
  const [eqStatus, setEqStatus] = useState<EquipmentStatus>('Available')
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    loadPageData('admin')
  }, [loadPageData])

  useEffect(() => {
    if (profile && !isPrivilegedRole(profile.role)) {
      router.replace('/dashboard')
    }
  }, [profile, router])

  const inventoryGroups = useMemo(() => {
    const map = new Map<string, InventoryGroup>()
    equipment.forEach(e => {
      const key = [
        e.base_name,
        e.category ?? '',
        e.location ?? '',
      ].join('|')
      const existing = map.get(key)
      if (existing) {
        existing.count++
        if (e.status === 'Available') existing.availableCount++
      } else {
        map.set(key, {
          name: e.base_name,
          category: e.category ?? '',
          location: e.location ?? '',
          count: 1,
          availableCount: e.status === 'Available' ? 1 : 0,
        })
      }
    })
    return Array.from(map.values())
  }, [equipment])

  const handleAddEquipment = async () => {
    const qty = parseInt(eqQty, 10)
    if (!eqName || Number.isNaN(qty) || qty <= 0) {
      alert('Enter a valid item name and quantity.')
      return
    }
    setAddLoading(true)
    try {
      await addEquipmentBatch(eqName, qty, eqCategory, eqLocation, eqStatus)
      setEqName('')
      setEqQty('')
      setEqCategory('')
      setEqLocation('')
      setEqStatus('Available')
      await refreshAll()
      alert('Equipment added.')
    } catch (err) {
      console.error(err)
      alert('Error adding equipment.')
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <>
      <Panel>
        <h3 className="mb-3 flex items-center gap-2 font-bold font-mono text-lg">
          <ChartColumn className="h-5 w-5 text-primary" />
          Inventory Overview
        </h3>
        <DataTable
          columns={[
            { header: 'Equipment', accessor: 'name' as keyof InventoryGroup },
            { header: 'Category', accessor: 'category' as keyof InventoryGroup },
            { header: 'Location', accessor: 'location' as keyof InventoryGroup },
            { header: 'Total', accessor: 'count' as keyof InventoryGroup },
            { header: 'Available', accessor: 'availableCount' as keyof InventoryGroup },
          ]}
          data={inventoryGroups}
          emptyMessage="No equipment in inventory."
        />
      </Panel>

      <Panel>
        <h3 className="mb-3 flex items-center gap-2 font-bold font-mono text-lg">
          <Package2 className="h-5 w-5 text-primary" />
          Inventory Management
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Equipment Name" value={eqName} onChange={event => setEqName(event.target.value)} />
          <Input type="number" label="Quantity" value={eqQty} onChange={event => setEqQty(event.target.value)} />
          <Input label="Equipment Category" value={eqCategory} onChange={event => setEqCategory(event.target.value)} />
          <Input label="Equipment Location" value={eqLocation} onChange={event => setEqLocation(event.target.value)} />
          <select
            value={eqStatus}
            onChange={event => setEqStatus(event.target.value as EquipmentStatus)}
            className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-sm font-mono md:col-span-2"
          >
            {EQUIPMENT_STATUSES.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <Button className="mt-4" fullWidth onClick={handleAddEquipment} disabled={addLoading}>
          {addLoading ? 'ADDING...' : 'ADD EQUIPMENT'}
        </Button>
      </Panel>
    </>
  )
}
