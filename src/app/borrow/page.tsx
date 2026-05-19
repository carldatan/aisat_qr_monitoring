'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { requestBorrowItems, addHistoryLog } from '@/lib/db'

export default function BorrowPage() {
  const router = useRouter()
  const profile = useAppStore(s => s.profile)
  const equipment = useAppStore(s => s.equipment)
  const refreshAll = useAppStore(s => s.refreshAll)

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile?.role === 'admin') router.replace('/dashboard')
  }, [profile, router])

  const categories = useMemo(() => {
    const cats = new Map<string, number>()
    equipment.forEach(e => {
      if (e.status === 'Available') {
        cats.set(e.base_name, (cats.get(e.base_name) ?? 0) + 1)
      }
    })
    // Also include categories with 0 available
    const allCats = new Set(equipment.map(e => e.base_name))
    allCats.forEach(cat => { if (!cats.has(cat)) cats.set(cat, 0) })
    return Array.from(cats.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [equipment])

  const handleRequest = async () => {
    if (!profile) return
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([baseName, quantity]) => ({ baseName, quantity }))

    if (items.length === 0) { alert('Select at least one item to request.'); return }

    setLoading(true)
    try {
      await requestBorrowItems(items, profile.id, profile.username)
      for (const item of items) {
        await addHistoryLog(
          profile.username,
          item.baseName,
          `Requested ${item.quantity} unit${item.quantity > 1 ? 's' : ''}`,
          profile.id
        )
      }
      setQuantities({})
      await refreshAll()
      alert('Request submitted for admin approval.')
    } catch (err) {
      alert('Error submitting request. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel>
      <h3 className="font-bold font-mono text-base mb-4">Available for Borrowing</h3>

      {categories.length === 0 ? (
        <p className="text-muted text-sm font-mono py-4">No equipment in inventory yet.</p>
      ) : (
        <div className="divide-y divide-border mb-4">
          {categories.map(([name, avail]) => (
            <div
              key={name}
              className="py-3 flex justify-between items-center"
            >
              <span className="font-mono text-sm">
                {name}{' '}
                <small className="text-muted">({avail} available)</small>
              </span>
              <input
                type="number"
                min={0}
                max={avail}
                value={quantities[name] ?? 0}
                disabled={avail === 0}
                onChange={e => {
                  const val = Math.min(parseInt(e.target.value) || 0, avail)
                  setQuantities(prev => ({ ...prev, [name]: val }))
                }}
                className="w-16 px-2 py-1.5 border border-border rounded font-mono text-sm text-center focus:outline-none focus:border-primary disabled:opacity-40"
              />
            </div>
          ))}
        </div>
      )}

      <Button fullWidth onClick={handleRequest} disabled={loading}>
        {loading ? 'SUBMITTING...' : 'REQUEST SELECTED'}
      </Button>
    </Panel>
  )
}
