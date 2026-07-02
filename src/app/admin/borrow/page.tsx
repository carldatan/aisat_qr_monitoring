'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, format } from 'date-fns'
import { QRCodeCanvas } from 'qrcode.react'
import { ClipboardList } from 'lucide-react'
import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhotoInput } from '@/components/admin/PhotoInput'
import { addHistoryLog, adminBorrowItems } from '@/lib/db'
import { formatDateOnly } from '@/lib/utils'
import { isPrivilegedRole } from '@/lib/roles'
import { RETURN_QR_PREFIX } from '@/lib/equipment'

function getDefaultReturnByDate() {
  return format(addDays(new Date(), 7), 'yyyy-MM-dd')
}

export default function BorrowPage() {
  const router = useRouter()
  const profile = useAppStore(s => s.profile)
  const equipment = useAppStore(s => s.equipment)
  const loadPageData = useAppStore(s => s.loadPageData)
  const refreshAll = useAppStore(s => s.refreshAll)

  const [selectedCategory, setSelectedCategory] = useState('')
  const [borrowGroupKey, setBorrowGroupKey] = useState('')
  const [borrowQty, setBorrowQty] = useState('1')
  const [borrowerName, setBorrowerName] = useState('')
  const [borrowerIdNumber, setBorrowerIdNumber] = useState('')
  const [returnLocation, setReturnLocation] = useState('')
  const [returnByDate, setReturnByDate] = useState(() => getDefaultReturnByDate())
  const [borrowItemPhoto, setBorrowItemPhoto] = useState('')
  const [borrowerBorrowPhoto, setBorrowerBorrowPhoto] = useState('')
  const [returnQrSaved, setReturnQrSaved] = useState(false)
  const [borrowLoading, setBorrowLoading] = useState(false)

  useEffect(() => {
    loadPageData('admin')
  }, [loadPageData])

  useEffect(() => {
    if (profile && !isPrivilegedRole(profile.role)) {
      router.replace('/dashboard')
    }
  }, [profile, router])

  useEffect(() => {
    setReturnQrSaved(false)
  }, [borrowerIdNumber])

  const availableGroups = useMemo(() => {
    const map = new Map<string, { baseName: string; category: string; location: string; count: number }>()
    equipment
      .filter(e => e.status === 'Available')
      .forEach(e => {
        const key = `${e.base_name}|${e.category ?? ''}|${e.location ?? ''}`
        const existing = map.get(key)
        if (existing) existing.count++
        else {
          map.set(key, {
            baseName: e.base_name,
            category: e.category ?? '',
            location: e.location ?? '',
            count: 1,
          })
        }
      })
    return Array.from(map.values()).sort((a, b) => a.baseName.localeCompare(b.baseName))
  }, [equipment])

  const categories = useMemo(() => {
    const set = new Set(availableGroups.map(g => g.category).filter(Boolean))
    return Array.from(set).sort()
  }, [availableGroups])

  const filteredGroups = useMemo(() => {
    if (!selectedCategory) return availableGroups
    return availableGroups.filter(g => g.category === selectedCategory)
  }, [availableGroups, selectedCategory])

  const selectedAvailable = filteredGroups.find(group =>
    `${group.baseName}|${group.category}|${group.location}` === borrowGroupKey
  )
  useEffect(() => {
    setReturnLocation(selectedAvailable?.location ?? '')
  }, [selectedAvailable?.location, borrowGroupKey])

  const returnQrValue = borrowerIdNumber
    ? `${RETURN_QR_PREFIX}${borrowerIdNumber.trim()}`
    : ''

  const handleBorrow = async () => {
    if (!profile) return
    const qty = parseInt(borrowQty, 10)
    const normalizedBorrowerId = borrowerIdNumber.trim()
    const normalizedReturnByDate = returnByDate || getDefaultReturnByDate()
    const normalizedReturnLocation = returnLocation.trim()
    const returnByDateIso = new Date(`${normalizedReturnByDate}T23:59:59`).toISOString()

    if (!selectedAvailable || !borrowerName || !normalizedBorrowerId || !normalizedReturnLocation || Number.isNaN(qty) || qty <= 0) {
      alert('Complete borrower, item, quantity, and return location fields.')
      return
    }
    if (!borrowItemPhoto || !borrowerBorrowPhoto) {
      alert('Add both borrow photos: item and borrower.')
      return
    }
    if (!returnQrSaved) {
      alert('Confirm that the borrower saved a copy of the return QR code.')
      return
    }

    setBorrowLoading(true)
    try {
      const total = await adminBorrowItems({
        baseName: selectedAvailable.baseName,
        category: selectedAvailable.category,
        location: selectedAvailable.location,
        quantity: qty,
        borrowerName,
        borrowerIdNumber: normalizedBorrowerId,
        lenderUsername: profile.username,
        returnLocation: normalizedReturnLocation,
        itemPhotoUrl: borrowItemPhoto,
        borrowerPhotoUrl: borrowerBorrowPhoto,
        returnByDate: returnByDateIso,
      })
      await addHistoryLog(
        normalizedBorrowerId,
        `${total}x ${selectedAvailable.baseName}`,
        'Borrowed',
        undefined,
        {
          description: `${borrowerName} borrowed ${total}x ${selectedAvailable.baseName}. Lender: ${profile.full_name} (@${profile.username}).`,
          itemPhotoUrl: borrowItemPhoto,
          borrowerPhotoUrl: borrowerBorrowPhoto,
        }
      )
      setBorrowGroupKey('')
      setBorrowQty('1')
      setBorrowerName('')
      setBorrowerIdNumber('')
      setReturnLocation('')
      setReturnByDate(getDefaultReturnByDate())
      setBorrowItemPhoto('')
      setBorrowerBorrowPhoto('')
      setReturnQrSaved(false)
      await refreshAll()
      alert('Borrow transaction recorded.')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Error recording borrow transaction.')
    } finally {
      setBorrowLoading(false)
    }
  }

  const handleDownloadReturnQr = () => {
    if (!returnQrValue) return
    const canvas = document.getElementById('borrower-return-qr') as HTMLCanvasElement | null
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `return-qr-${borrowerIdNumber.trim()}.png`
    link.click()
  }

  return (
    <Panel>
      <h3 className="mb-3 flex items-center gap-2 font-bold font-mono text-lg">
        <ClipboardList className="h-5 w-5 text-primary" />
        Borrow Transaction
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="relative w-full">
          <select
            value={selectedCategory}
            onChange={event => {
              setSelectedCategory(event.target.value)
              setBorrowGroupKey('')
            }}
            className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-sm font-mono"
          >
            <option value="">All categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="relative w-full">
          <select
            value={borrowGroupKey}
            onChange={event => setBorrowGroupKey(event.target.value)}
            className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-sm font-mono"
          >
            <option value="">Select equipment</option>
            {filteredGroups.map(group => (
              <option
                key={`${group.baseName}|${group.category}|${group.location}`}
                value={`${group.baseName}|${group.category}|${group.location}`}
              >
                {group.baseName} - {group.category || 'Uncategorized'} / {group.location || 'Unassigned'} ({group.count} available)
              </option>
            ))}
          </select>
        </div>
        <Input
          type="number"
          label="Quantity"
          min={1}
          max={selectedAvailable?.count ?? 1}
          value={borrowQty}
          onChange={event => setBorrowQty(event.target.value)}
        />
        <Input
          label="Borrower Name"
          value={borrowerName}
          onChange={event => setBorrowerName(event.target.value)}
        />
        <Input
          label="Borrower ID Number"
          value={borrowerIdNumber}
          onChange={event => setBorrowerIdNumber(event.target.value)}
        />
        <Input
          label="Return Location"
          value={returnLocation}
          onChange={event => setReturnLocation(event.target.value)}
        />
        <Input
          type="date"
          label="Return By Date"
          value={returnByDate}
          onChange={event => setReturnByDate(event.target.value)}
        />
      </div>
      {selectedAvailable && (
        <div className="mt-3 space-y-1 text-xs font-mono text-muted">
          <p>
            Category: {selectedAvailable.category || 'Uncategorized'} | Location: {selectedAvailable.location || 'Unassigned'} | Lender: @{profile?.username}
          </p>
          <p>
            Default return by: {formatDateOnly(`${(returnByDate || getDefaultReturnByDate())}T00:00:00`)}
          </p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <PhotoInput label="Borrow Item Picture" value={borrowItemPhoto} onChange={setBorrowItemPhoto} />
        <PhotoInput label="Borrower Picture" value={borrowerBorrowPhoto} onChange={setBorrowerBorrowPhoto} />
      </div>
      {returnQrValue && (
        <div className="mt-4 rounded border border-border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="rounded border border-border bg-white p-3">
              <QRCodeCanvas
                id="borrower-return-qr"
                value={returnQrValue}
                size={160}
                level="M"
                includeMargin
              />
            </div>
            <div className="flex-1">
              <h4 className="font-bold font-mono text-sm">Return QR Code</h4>
              <p className="mt-1 text-xs font-mono text-muted">
                Borrower: {borrowerName || '--'} | ID: {borrowerIdNumber.trim()}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="ghost" onClick={handleDownloadReturnQr}>
                  DOWNLOAD QR
                </Button>
                <label className="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs font-bold font-mono">
                  <input
                    type="checkbox"
                    checked={returnQrSaved}
                    onChange={event => setReturnQrSaved(event.target.checked)}
                  />
                  Borrower saved QR copy
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      <Button
        className="mt-4"
        fullWidth
        onClick={handleBorrow}
        disabled={borrowLoading}
      >
        {borrowLoading ? 'RECORDING...' : 'RECORD BORROW'}
      </Button>
    </Panel>
  )
}
