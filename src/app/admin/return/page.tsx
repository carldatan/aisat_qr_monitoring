'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3 } from 'lucide-react'
import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { PhotoInput } from '@/components/admin/PhotoInput'
import { QRScanner } from '@/components/scanner/QRScanner'
import { addHistoryLog, addScannedLibrary, returnItemsPartial } from '@/lib/db'
import { isPrivilegedRole } from '@/lib/roles'
import { RETURN_QR_PREFIX, type ReturnItem, type ReturnSession } from '@/lib/equipment'

export default function ReturnPage() {
  const router = useRouter()
  const profile = useAppStore(s => s.profile)
  const equipment = useAppStore(s => s.equipment)
  const loadPageData = useAppStore(s => s.loadPageData)
  const refreshAll = useAppStore(s => s.refreshAll)

  const [manualReturnUser, setManualReturnUser] = useState('')
  const [returnSession, setReturnSession] = useState<ReturnSession | null>(null)
  const [returnItemPhoto, setReturnItemPhoto] = useState('')
  const [borrowerReturnPhoto, setBorrowerReturnPhoto] = useState('')
  const [returnLoading, setReturnLoading] = useState(false)

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

  const activeBorrowers = useMemo(() => {
    const map = new Map<string, { key: string; name: string; idNumber: string; count: number }>()
    borrowedItems.forEach(item => {
      const key = item.borrower_id_number || item.borrower_username || item.borrower_name || item.id
      const existing = map.get(key)
      if (existing) existing.count++
      else {
        map.set(key, {
          key,
          name: item.borrower_name || key,
          idNumber: item.borrower_id_number || key,
          count: 1,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [borrowedItems])

  const totalReturning =
    returnSession?.items.reduce((sum, item) => sum + item.returnQty, 0) ?? 0

  const buildReturnSession = (borrowerKey: string): ReturnSession | null => {
    const borrowed = borrowedItems.filter(item =>
      item.borrower_id_number === borrowerKey ||
      item.borrower_username === borrowerKey ||
      item.borrower_name === borrowerKey
    )
    if (borrowed.length === 0) return null

    const first = borrowed[0]
    const itemMap = new Map<string, ReturnItem>()
    borrowed.forEach(item => {
      const key = [
        item.base_name,
        item.lender_username ?? '',
        item.category ?? '',
        item.location ?? '',
        item.return_location ?? '',
      ].join('|')
      const existing = itemMap.get(key)
      if (existing) existing.totalBorrowed++
      else {
        itemMap.set(key, {
          baseName: item.base_name,
          totalBorrowed: 1,
          returnQty: 1,
          lenderUsername: item.lender_username ?? '',
          category: item.category ?? '',
          location: item.location ?? '',
          returnLocation: item.return_location ?? '',
        })
      }
    })
    return {
      borrowerKey,
      fullName: first.borrower_name || borrowerKey,
      idNumber: first.borrower_id_number || borrowerKey,
      items: Array.from(itemMap.values()),
    }
  }

  const updateReturnQty = (index: number, newQty: number) => {
    setReturnSession(prev => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((item, i) =>
          i === index
            ? { ...item, returnQty: Math.max(0, Math.min(newQty, item.totalBorrowed)) }
            : item
        ),
      }
    })
  }

  const handleReturnQrScan = (text: string) => {
    if (!text.startsWith(RETURN_QR_PREFIX)) {
      alert('Invalid return QR code.')
      return
    }
    const borrowerKey = text.slice(RETURN_QR_PREFIX.length).trim()
    if (!borrowerKey) {
      alert('Return QR code is missing borrower information.')
      return
    }
    const session = buildReturnSession(borrowerKey)
    if (!session) {
      alert('No borrowed items found for this QR code.')
      return
    }
    setManualReturnUser(borrowerKey)
    setReturnSession(session)
    setReturnItemPhoto('')
    setBorrowerReturnPhoto('')
  }

  const handleOpenManualReturn = () => {
    if (!manualReturnUser) return
    const session = buildReturnSession(manualReturnUser)
    if (!session) {
      alert('No borrowed items found for this borrower.')
      return
    }
    setReturnSession(session)
    setReturnItemPhoto('')
    setBorrowerReturnPhoto('')
  }

  const handleConfirmReturn = async () => {
    if (!returnSession || !profile) return
    const toReturn = returnSession.items
      .filter(item => item.returnQty > 0)
      .map(item => ({
        baseName: item.baseName,
        qty: item.returnQty,
        category: item.category,
        location: item.location,
        returnLocation: item.returnLocation || undefined,
        lenderUsername: item.lenderUsername,
      }))

    if (toReturn.length === 0) {
      alert('Select at least one item to return.')
      return
    }
    if (!returnItemPhoto || !borrowerReturnPhoto) {
      alert('Add both return photos: item and borrower.')
      return
    }

    setReturnLoading(true)
    try {
      const total = await returnItemsPartial(returnSession.borrowerKey, toReturn, {
        itemPhotoUrl: returnItemPhoto,
        borrowerPhotoUrl: borrowerReturnPhoto,
      })
      await addScannedLibrary({
        studentName: returnSession.fullName,
        studentIdNumber: returnSession.idNumber,
        itemsCount: total,
        processedBy: profile.username,
      })

      for (const item of returnSession.items.filter(item => item.returnQty > 0)) {
        await addHistoryLog(
          returnSession.idNumber,
          `${item.returnQty}x ${item.baseName}`,
          'Returned',
          undefined,
          {
            description: `${returnSession.fullName} returned ${item.returnQty}x ${item.baseName}. Lender: @${item.lenderUsername || profile.username}. Processed by: @${profile.username}.`,
            itemPhotoUrl: returnItemPhoto,
            borrowerPhotoUrl: borrowerReturnPhoto,
          }
        )
      }

      setReturnSession(null)
      setManualReturnUser('')
      setReturnItemPhoto('')
      setBorrowerReturnPhoto('')
      await refreshAll()
      alert('Return transaction recorded.')
    } catch (err) {
      console.error(err)
      alert('Error recording return transaction.')
    } finally {
      setReturnLoading(false)
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_3fr] items-start">
      <Panel className="p-4">
        <h3 className="mb-2 flex items-center gap-2 font-bold font-mono text-sm">
          <Clock3 className="h-4 w-4 text-primary" />
          Return
        </h3>
        <div className="mb-3 rounded border border-border p-3">
          <h4 className="mb-2 font-bold font-mono text-xs">
            Scan QR
          </h4>
          <QRScanner onScanSuccess={handleReturnQrScan} />
        </div>
        <div className="flex flex-col gap-2">
          <select
            value={manualReturnUser}
            onChange={event => setManualReturnUser(event.target.value)}
            className="w-full rounded border border-border bg-white px-3 py-2.5 text-xs font-mono"
          >
            <option value="">Select borrower</option>
            {activeBorrowers.map(borrower => (
              <option key={borrower.key} value={borrower.key}>
                {borrower.name} ({borrower.idNumber}) - {borrower.count} item(s)
              </option>
            ))}
          </select>
          <Button
            variant="success"
            onClick={handleOpenManualReturn}
            disabled={!manualReturnUser}
          >
            OPEN RETURN
          </Button>
        </div>
      </Panel>

      {returnSession && (
        <Panel className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h4 className="font-bold font-mono text-xs text-success">
                {returnSession.fullName}
              </h4>
              <p className="text-2xs font-mono text-muted">
                ID: {returnSession.idNumber}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger border-danger"
              onClick={() => setReturnSession(null)}
            >
              CANCEL
            </Button>
          </div>
          <table className="w-full border-collapse text-xs font-mono">
            <thead>
              <tr>
                <th className="border border-gray-100 bg-surface px-2 py-1.5 text-left whitespace-nowrap">Item</th>
                <th className="border border-gray-100 bg-surface px-2 py-1.5 text-left whitespace-nowrap">Details</th>
                <th className="border border-gray-100 bg-surface px-2 py-1.5 text-left whitespace-nowrap">Return Loc</th>
                <th className="border border-gray-100 bg-surface px-2 py-1.5 text-left whitespace-nowrap">Borrowed</th>
                <th className="border border-gray-100 bg-surface px-2 py-1.5 text-left whitespace-nowrap">Return Qty</th>
              </tr>
            </thead>
            <tbody>
              {returnSession.items.map((item, index) => (
                <tr key={`${item.baseName}-${item.lenderUsername}-${index}`}>
                  <td className="border border-gray-100 px-2 py-1.5 whitespace-nowrap">{item.baseName}</td>
                  <td className="border border-gray-100 px-2 py-1.5 text-2xs text-muted whitespace-nowrap">
                    {item.category || 'Uncategorized'} | {item.location || 'Unassigned'} | @{item.lenderUsername || profile?.username}
                  </td>
                  <td className="border border-gray-100 px-2 py-1.5 text-2xs text-muted whitespace-nowrap">
                    {item.returnLocation || item.location || 'Unassigned'}
                  </td>
                  <td className="border border-gray-100 px-2 py-1.5 whitespace-nowrap">{item.totalBorrowed}</td>
                  <td className="border border-gray-100 px-2 py-1.5 whitespace-nowrap">
                    <input
                      type="number"
                      min={0}
                      max={item.totalBorrowed}
                      value={item.returnQty}
                      onChange={event => updateReturnQty(index, parseInt(event.target.value, 10) || 0)}
                      className="w-14 rounded border border-border px-1.5 py-0.5 text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid gap-3 md:grid-cols-2 mt-3">
            <PhotoInput label="Return Item Picture" value={returnItemPhoto} onChange={setReturnItemPhoto} />
            <PhotoInput label="Return Borrower Picture" value={borrowerReturnPhoto} onChange={setBorrowerReturnPhoto} />
          </div>
          <Button
            className="mt-3"
            variant="success"
            fullWidth
            onClick={handleConfirmReturn}
            disabled={returnLoading || totalReturning === 0}
          >
            {returnLoading ? 'RECORDING...' : `CONFIRM RETURN (${totalReturning})`}
          </Button>
        </Panel>
      )}
    </div>
  )
}
