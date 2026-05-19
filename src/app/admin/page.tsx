'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { QRScanner } from '@/components/scanner/QRScanner'
import {
  approveRequest, disapproveRequest, returnItemsByUser, returnItemsPartial,
  addEquipmentBatch, addHistoryLog, addScannedLibrary, updateProfileRole, deleteProfile,
} from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import type { Equipment, Profile } from '@/types'

interface ReturnItem { baseName: string; count: number; returnQty: number }

export default function AdminPage() {
  const router = useRouter()
  const profile = useAppStore(s => s.profile)
  const equipment = useAppStore(s => s.equipment)
  const profiles = useAppStore(s => s.profiles)
  const refreshAll = useAppStore(s => s.refreshAll)

  // Redirect non-admins
  useEffect(() => {
    if (profile && profile.role !== 'admin') router.replace('/dashboard')
  }, [profile, router])

  // QR return flow
  const [pendingReturnUsername, setPendingReturnUsername] = useState<string | null>(null)
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])

  // Inventory add
  const [eqName, setEqName] = useState('')
  const [eqQty, setEqQty] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Bulk return
  const [bulkReturnUser, setBulkReturnUser] = useState('')

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const pendingGroups = useMemo(() => {
    const map = new Map<string, { username: string; itemName: string; count: number }>()
    equipment
      .filter(e => e.status === 'Pending')
      .forEach(e => {
        const key = `${e.borrower_username}|${e.base_name}`
        const existing = map.get(key)
        if (existing) existing.count++
        else map.set(key, { username: e.borrower_username!, itemName: e.base_name, count: 1 })
      })
    return Array.from(map.values())
  }, [equipment])

  const borrowedItems = useMemo(
    () => equipment.filter(e => e.status === 'Borrowed'),
    [equipment]
  )

  const activeBorrowers = useMemo(
    () => [...new Set(borrowedItems.map(e => e.borrower_username!))],
    [borrowedItems]
  )

  const inventoryGroups = useMemo(() => {
    const map = new Map<string, { name: string; status: string; user: string | null; count: number }>()
    equipment.forEach(e => {
      const key = `${e.base_name}|${e.status}|${e.borrower_username}`
      const existing = map.get(key)
      if (existing) existing.count++
      else map.set(key, { name: e.base_name, status: e.status, user: e.borrower_username, count: 1 })
    })
    return Array.from(map.values())
  }, [equipment])

  // ─── QR Scan Handler ──────────────────────────────────────────────────────────

  const handleScan = (text: string) => {
    if (!text.startsWith('BATCH|')) return
    const username = text.split('|')[1]
    const targetProfile = profiles.find(p => p.username === username)
    if (!targetProfile) { alert('Unknown user in QR code.'); return }

    const items = equipment.filter(e => e.borrower_username === username && e.status === 'Borrowed')
    if (items.length === 0) { alert(`No borrowed items for @${username}.`); return }

    const itemMap = new Map<string, number>()
    items.forEach(e => itemMap.set(e.base_name, (itemMap.get(e.base_name) ?? 0) + 1))

    const returnItemsList: ReturnItem[] = Array.from(itemMap.entries()).map(([baseName, count]) => ({
      baseName, count, returnQty: count,
    }))

    setPendingReturnUsername(username)
    setReturnItems(returnItemsList)
  }

  const handleConfirmReturn = async () => {
    if (!pendingReturnUsername || !profile) return
    const toReturn = returnItems
      .filter(i => i.returnQty > 0)
      .map(i => ({ baseName: i.baseName, qty: i.returnQty }))

    try {
      const total = await returnItemsPartial(pendingReturnUsername, toReturn)
      if (total > 0) {
        const returnee = profiles.find(p => p.username === pendingReturnUsername)
        await addScannedLibrary({
          studentName: returnee?.full_name ?? pendingReturnUsername,
          studentIdNumber: returnee?.id_number ?? '',
          itemsCount: total,
          processedBy: profile.username,
        })
        await addHistoryLog(pendingReturnUsername, `${total} Items`, 'QR Return', undefined)
        alert(`Successfully returned ${total} item(s) for @${pendingReturnUsername}.`)
      } else {
        alert('No items returned (all quantities were 0).')
      }
    } catch (err) {
      alert('Error processing return.')
      console.error(err)
    } finally {
      setPendingReturnUsername(null)
      setReturnItems([])
      await refreshAll()
    }
  }

  const handleBulkReturn = async () => {
    if (!bulkReturnUser || !profile) return
    try {
      const count = await returnItemsByUser(bulkReturnUser)
      const returnee = profiles.find(p => p.username === bulkReturnUser)
      if (count > 0) {
        await addScannedLibrary({
          studentName: returnee?.full_name ?? bulkReturnUser,
          studentIdNumber: returnee?.id_number ?? '',
          itemsCount: count,
          processedBy: profile.username,
        })
        await addHistoryLog(bulkReturnUser, `${count} Items`, 'Manual Return')
        alert(`Returned ${count} items for @${bulkReturnUser}.`)
      }
      await refreshAll()
    } catch (err) {
      alert('Error processing return.')
      console.error(err)
    }
  }

  const handleApprove = async (username: string, itemName: string) => {
    try {
      await approveRequest(username, itemName)
      await addHistoryLog(username, itemName, 'Approved Request')
      await refreshAll()
    } catch (err) { console.error(err) }
  }

  const handleDisapprove = async (username: string, itemName: string) => {
    try {
      await disapproveRequest(username, itemName)
      await addHistoryLog(username, itemName, 'Disapproved Request')
      await refreshAll()
    } catch (err) { console.error(err) }
  }

  const handleAddEquipment = async () => {
    const qty = parseInt(eqQty)
    if (!eqName || isNaN(qty) || qty <= 0) { alert('Enter a valid name and quantity.'); return }
    setAddLoading(true)
    try {
      await addEquipmentBatch(eqName, qty)
      setEqName('')
      setEqQty('')
      await refreshAll()
      alert(`Added ${qty} unit(s) of "${eqName}".`)
    } catch (err) {
      alert('Error adding equipment.')
      console.error(err)
    } finally {
      setAddLoading(false)
    }
  }

  const handleMakeAdmin = async (userId: string, name: string) => {
    if (!confirm(`Promote ${name} to Admin?`)) return
    try {
      await updateProfileRole(userId, 'admin')
      await refreshAll()
      alert(`${name} is now an admin.`)
    } catch (err) { console.error(err) }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Remove this user?')) return
    try {
      await deleteProfile(userId)
      await refreshAll()
    } catch (err) { console.error(err) }
  }

  return (
    <>
      {/* QR Scanner */}
      <Panel>
        <h3 className="font-bold font-mono text-base mb-4">QR Scanner</h3>
        <QRScanner onScanSuccess={handleScan} />
      </Panel>

      {/* Return Form */}
      {pendingReturnUsername && (
        <Panel>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold font-mono text-base">Return Form</h3>
            <button
              onClick={() => { setPendingReturnUsername(null); setReturnItems([]) }}
              className="text-xs font-bold font-mono text-danger border border-danger px-3 py-1.5 rounded hover:bg-red-50"
            >
              CANCEL
            </button>
          </div>
          <p className="text-xs text-muted font-mono mb-3">
            Review quantities and click <strong>CONFIRM RETURN</strong> to process.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono border-collapse">
              <thead>
                <tr>
                  {['Item', 'User', 'Borrowed Qty', 'Return Qty'].map(h => (
                    <th key={h} className="px-3 py-2 border border-gray-100 bg-surface text-left text-gray-500 font-bold text-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {returnItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 border border-gray-100">{item.baseName}</td>
                    <td className="px-3 py-2 border border-gray-100 text-muted">@{pendingReturnUsername}</td>
                    <td className="px-3 py-2 border border-gray-100">{item.count}</td>
                    <td className="px-3 py-2 border border-gray-100">
                      <input
                        type="number"
                        min={0}
                        max={item.count}
                        value={item.returnQty}
                        onChange={e => {
                          const val = Math.min(parseInt(e.target.value) || 0, item.count)
                          setReturnItems(prev =>
                            prev.map((it, idx) => idx === i ? { ...it, returnQty: val } : it)
                          )
                        }}
                        className="w-16 px-2 py-1 border border-border rounded text-center focus:outline-none focus:border-primary"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="success" fullWidth className="mt-4" onClick={handleConfirmReturn}>
            CONFIRM RETURN
          </Button>
        </Panel>
      )}

      {/* Pending Requests */}
      <Panel>
        <h3 className="font-bold font-mono text-base mb-3">Pending Requests</h3>
        <DataTable
          columns={[
            { header: 'Item', accessor: 'itemName' as keyof (typeof pendingGroups)[0] },
            { header: 'User', accessor: (row) => <span>@{row.username}</span> },
            { header: 'Qty', accessor: 'count' as keyof (typeof pendingGroups)[0] },
            {
              header: 'Action',
              accessor: (row) => (
                <div className="flex gap-1">
                  <Button size="sm" variant="success" onClick={() => handleApprove(row.username, row.itemName)}>
                    APPROVE
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDisapprove(row.username, row.itemName)}>
                    DISAPPROVE
                  </Button>
                </div>
              ),
            },
          ]}
          data={pendingGroups}
          emptyMessage="No pending requests."
        />
      </Panel>

      {/* Master Borrowing Database */}
      <Panel>
        <h3 className="font-bold font-mono text-base mb-3">Master Borrowing Database</h3>
        <DataTable
          columns={[
            { header: 'QR ID', accessor: (row: Equipment) => <span className="text-xs text-muted">{row.id.slice(0, 8)}…</span> },
            { header: 'Equipment', accessor: 'base_name' as keyof Equipment },
            { header: 'User', accessor: (row: Equipment) => <span>@{row.borrower_username}</span> },
            {
              header: 'Borrow Date',
              accessor: (row: Equipment) => (
                <span className="text-xs">{row.borrow_time ? formatDateTime(row.borrow_time) : '--'}</span>
              ),
            },
          ]}
          data={borrowedItems}
          emptyMessage="No items currently borrowed."
        />
      </Panel>

      {/* Return by User */}
      <Panel>
        <h3 className="font-bold font-mono text-base mb-3">Return by User</h3>
        <select
          value={bulkReturnUser}
          onChange={e => setBulkReturnUser(e.target.value)}
          className="w-full px-3.5 py-3.5 bg-white text-gray-800 border border-border rounded font-mono text-sm mb-3 focus:outline-none focus:border-primary"
        >
          <option value="">-- Select Student --</option>
          {activeBorrowers.map(u => {
            const p = profiles.find(pr => pr.username === u)
            return (
              <option key={u} value={u}>
                {p?.full_name ?? u} (@{u})
              </option>
            )
          })}
        </select>
        <Button variant="success" fullWidth onClick={handleBulkReturn} disabled={!bulkReturnUser}>
          RETURN ALL ITEMS BY THIS USER
        </Button>
      </Panel>

      {/* Inventory Overview */}
      <Panel>
        <h3 className="font-bold font-mono text-base mb-3">Inventory Overview</h3>
        <DataTable
          columns={[
            { header: 'Item', accessor: 'name' as keyof (typeof inventoryGroups)[0] },
            { header: 'Qty', accessor: 'count' as keyof (typeof inventoryGroups)[0] },
            { header: 'Status', accessor: 'status' as keyof (typeof inventoryGroups)[0] },
            {
              header: 'Borrower',
              accessor: (row) => (
                <span className="text-success font-bold">
                  {row.user ? `@${row.user}` : '--'}
                </span>
              ),
            },
          ]}
          data={inventoryGroups}
          emptyMessage="No equipment in inventory."
        />
      </Panel>

      {/* User Management */}
      <Panel>
        <h3 className="font-bold font-mono text-base mb-3">User Management</h3>
        <DataTable
          columns={[
            { header: 'Name', accessor: 'full_name' as keyof Profile },
            { header: 'Username', accessor: 'username' as keyof Profile },
            { header: 'Role', accessor: 'role' as keyof Profile },
            {
              header: 'Actions',
              accessor: (row: Profile) =>
                row.username === 'admin' ? (
                  <span className="text-muted text-xs">Root</span>
                ) : (
                  <div className="flex gap-1">
                    {row.role !== 'admin' && (
                      <Button size="sm" variant="ghost" className="text-success border-success"
                        onClick={() => handleMakeAdmin(row.id, row.full_name)}>
                        MAKE ADMIN
                      </Button>
                    )}
                    {profile.id !== row.id && <Button size="sm" variant="ghost" className="text-danger border-danger"
                      onClick={() => handleRemoveUser(row.id)}>
                      REMOVE
                    </Button> }
                  </div>
                ),
            },
          ]}
          data={profiles}
          emptyMessage="No users found."
        />
      </Panel>

      {/* Inventory Management */}
      <Panel>
        <h3 className="font-bold font-mono text-base mb-3">Inventory Management</h3>
        <div className="flex flex-col gap-2.5">
          <Input
            label="Item Name"
            value={eqName}
            onChange={e => setEqName(e.target.value)}
          />
          <Input
            type="number"
            label="Quantity"
            value={eqQty}
            onChange={e => setEqQty(e.target.value)}
          />
          <Button fullWidth onClick={handleAddEquipment} disabled={addLoading}>
            {addLoading ? 'ADDING...' : 'ADD STOCK'}
          </Button>
        </div>
      </Panel>
    </>
  )
}
