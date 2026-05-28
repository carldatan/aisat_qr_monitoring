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
	approveRequest, disapproveRequest, returnItemsPartial,
	addEquipmentBatch, addHistoryLog, addScannedLibrary, updateProfileRole, deleteProfile,
} from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import type { Equipment, Profile } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReturnItem {
	baseName: string
	totalBorrowed: number   // total units this user has borrowed of this item
	returnQty: number       // how many admin is marking as returned
}

interface ReturnSession {
	username: string
	fullName: string
	idNumber: string
	items: ReturnItem[]
	triggeredBy: 'qr' | 'manual'
}

export default function AdminPage() {
	const router = useRouter()
	const profile = useAppStore(s => s.profile)
	const equipment = useAppStore(s => s.equipment)
	const profiles = useAppStore(s => s.profiles)
	const refreshAll = useAppStore(s => s.refreshAll)

	useEffect(() => {
		if (profile && profile.role !== 'admin') router.replace('/dashboard')
	}, [profile, router])

	// ─── Return session state ─────────────────────────────────────────────────
	const [returnSession, setReturnSession] = useState<ReturnSession | null>(null)
	const [confirmLoading, setConfirmLoading] = useState(false)

	// ─── Inventory add ────────────────────────────────────────────────────────
	const [eqName, setEqName] = useState('')
	const [eqQty, setEqQty] = useState('')
	const [addLoading, setAddLoading] = useState(false)

	// ─── Manual return — selected user ───────────────────────────────────────
	const [manualReturnUser, setManualReturnUser] = useState('')

	// ─── Derived data ─────────────────────────────────────────────────────────

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

	// ─── Helpers ──────────────────────────────────────────────────────────────

	/**
	 * Build a ReturnSession from a username by aggregating their borrowed items.
	 */
	const buildReturnSession = (username: string, triggeredBy: 'qr' | 'manual'): ReturnSession | null => {
		const borrowed = equipment.filter(
			e => e.borrower_username === username && e.status === 'Borrowed'
		)
		if (borrowed.length === 0) return null

		const itemMap = new Map<string, number>()
		borrowed.forEach(e => itemMap.set(e.base_name, (itemMap.get(e.base_name) ?? 0) + 1))

		const items: ReturnItem[] = Array.from(itemMap.entries()).map(([baseName, totalBorrowed]) => ({
			baseName,
			totalBorrowed,
			returnQty: totalBorrowed,   // default: return all
		}))

		const borrowerProfile = profiles.find(p => p.username === username)

		return {
			username,
			fullName: borrowerProfile?.full_name ?? username,
			idNumber: borrowerProfile?.id_number ?? '',
			items,
			triggeredBy,
		}
	}

	const updateReturnQty = (index: number, newQty: number) => {
		if (!returnSession) return
		setReturnSession(prev => {
			if (!prev) return prev
			const updated = prev.items.map((item, i) =>
				i === index
					? { ...item, returnQty: Math.max(0, Math.min(newQty, item.totalBorrowed)) }
					: item
			)
			return { ...prev, items: updated }
		})
	}

	const totalReturning = returnSession?.items.reduce((sum, i) => sum + i.returnQty, 0) ?? 0

	// ─── QR Scan Handler ──────────────────────────────────────────────────────

	const handleScan = (text: string) => {
		if (!text.startsWith('BATCH|')) {
			alert('Invalid QR code format.')
			return
		}
		const username = text.split('|')[1]
		if (!profiles.find(p => p.username === username)) {
			alert('Unknown user in QR code.')
			return
		}

		const session = buildReturnSession(username, 'qr')
		if (!session) {
			alert(`@${username} has no currently borrowed items.`)
			return
		}
		setReturnSession(session)
	}

	// ─── Manual Return Handler ────────────────────────────────────────────────

	const handleOpenManualReturn = () => {
		if (!manualReturnUser) return
		const session = buildReturnSession(manualReturnUser, 'manual')
		if (!session) {
			alert(`@${manualReturnUser} has no currently borrowed items.`)
			return
		}
		setReturnSession(session)
	}

	// ─── Confirm Return ───────────────────────────────────────────────────────

	const handleConfirmReturn = async () => {
		if (!returnSession || !profile) return

		const toReturn = returnSession.items
			.filter(i => i.returnQty > 0)
			.map(i => ({ baseName: i.baseName, qty: i.returnQty }))

		if (toReturn.length === 0) {
			alert('No items selected for return. Set at least one quantity above 0.')
			return
		}

		setConfirmLoading(true)
		try {
			const total = await returnItemsPartial(returnSession.username, toReturn)

			if (total > 0) {
				await addScannedLibrary({
					studentName: returnSession.fullName,
					studentIdNumber: returnSession.idNumber,
					itemsCount: total,
					processedBy: profile.username,
				})
				// Log each item separately for a clear audit trail
				for (const item of toReturn) {
					await addHistoryLog(
						returnSession.username,
						`${item.qty}× ${item.baseName}`,
						returnSession.triggeredBy === 'qr' ? 'QR Return' : 'Manual Return',
						undefined
					)
				}
				alert(
					`✓ Return processed.\n\n` +
					toReturn.map(i => `  • ${i.qty}× ${i.baseName}`).join('\n') +
					`\n\nTotal: ${total} item(s) returned for @${returnSession.username}.`
				)
			} else {
				alert('No items were returned. Please check quantities.')
			}
		} catch (err) {
			alert('Error processing return. Please try again.')
			console.error(err)
		} finally {
			setConfirmLoading(false)
			setReturnSession(null)
			setManualReturnUser('')
			await refreshAll()
		}
	}

	// ─── Other admin actions ──────────────────────────────────────────────────

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

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<>
			{/* ── QR Scanner ────────────────────────────────────────────────── */}
			<Panel>
				<h3 className="font-bold font-mono text-base mb-1">QR Scanner</h3>
				<p className="text-xs text-muted font-mono mb-4">
					Scan a student&apos;s return pass to open the return form.
				</p>
				<QRScanner onScanSuccess={handleScan} />
			</Panel>

			{/* ── Return Form (shown after QR scan OR manual lookup) ─────────── */}
			{returnSession && (
				<Panel className="border-2 border-success">
					{/* Header */}
					<div className="flex justify-between items-start mb-4">
						<div>
							<h3 className="font-bold font-mono text-base text-success">
								Return Form
								<span className="ml-2 text-xs font-normal text-muted">
									({returnSession.triggeredBy === 'qr' ? 'via QR scan' : 'manual lookup'})
								</span>
							</h3>
							<p className="text-sm font-mono mt-1">
								<span className="font-bold">{returnSession.fullName}</span>
								{' '}<span className="text-muted">(@{returnSession.username})</span>
								{returnSession.idNumber && (
									<span className="ml-2 text-muted text-xs">ID: {returnSession.idNumber}</span>
								)}
							</p>
						</div>
						<button
							onClick={() => setReturnSession(null)}
							className="text-xs font-bold font-mono text-danger border border-danger px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
						>
							CANCEL
						</button>
					</div>

					{/* Instructions */}
					<p className="text-xs text-muted font-mono mb-4 p-3 bg-surface rounded border border-border">
						Adjust the <strong>Return Qty</strong> for each item. Set to <strong>0</strong> to skip an item.
						The admin is responsible for confirming what was physically handed back.
					</p>

					{/* Item table */}
					<div className="overflow-x-auto mb-4">
						<table className="w-full text-sm font-mono border-collapse">
							<thead>
								<tr>
									{['Item', 'Total Borrowed', 'Return Qty', 'Keeping'].map(h => (
										<th
											key={h}
											className="px-3 py-2.5 border border-gray-100 bg-surface text-left text-gray-500 font-bold text-xs"
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{returnSession.items.map((item, i) => {
									const keeping = item.totalBorrowed - item.returnQty
									return (
										<tr key={i} className={item.returnQty === 0 ? 'opacity-50' : ''}>
											<td className="px-3 py-2.5 border border-gray-100 font-bold">
												{item.baseName}
											</td>
											<td className="px-3 py-2.5 border border-gray-100 text-center">
												{item.totalBorrowed}
											</td>
											<td className="px-3 py-2.5 border border-gray-100">
												<div className="flex items-center gap-2">
													<button
														className="w-7 h-7 rounded border border-border bg-surface hover:bg-gray-100 font-bold text-sm leading-none"
														onClick={() => updateReturnQty(i, item.returnQty - 1)}
													>
														−
													</button>
													<input
														type="number"
														min={0}
														max={item.totalBorrowed}
														value={item.returnQty}
														onChange={e => updateReturnQty(i, parseInt(e.target.value) || 0)}
														className="w-14 px-2 py-1 border border-border rounded text-center focus:outline-none focus:border-primary font-mono text-sm"
													/>
													<button
														className="w-7 h-7 rounded border border-border bg-surface hover:bg-gray-100 font-bold text-sm leading-none"
														onClick={() => updateReturnQty(i, item.returnQty + 1)}
													>
														+
													</button>
												</div>
											</td>
											<td className={`px-3 py-2.5 border border-gray-100 text-center font-bold ${keeping > 0 ? 'text-danger' : 'text-success'}`}>
												{keeping > 0 ? `${keeping} still out` : '✓ all back'}
											</td>
										</tr>
									)
								})}
							</tbody>
							{/* Summary row */}
							<tfoot>
								<tr className="bg-surface">
									<td className="px-3 py-2 border border-gray-100 font-bold text-xs text-muted" colSpan={1}>
										TOTAL
									</td>
									<td className="px-3 py-2 border border-gray-100 text-center font-bold">
										{returnSession.items.reduce((s, i) => s + i.totalBorrowed, 0)}
									</td>
									<td className="px-3 py-2 border border-gray-100 text-center font-bold text-success">
										{totalReturning}
									</td>
									<td className="px-3 py-2 border border-gray-100 text-center font-bold text-danger">
										{returnSession.items.reduce((s, i) => s + i.totalBorrowed, 0) - totalReturning} remaining
									</td>
								</tr>
							</tfoot>
						</table>
					</div>

					<Button
						variant="success"
						fullWidth
						onClick={handleConfirmReturn}
						disabled={confirmLoading || totalReturning === 0}
					>
						{confirmLoading
							? 'PROCESSING...'
							: `CONFIRM RETURN (${totalReturning} item${totalReturning !== 1 ? 's' : ''})`}
					</Button>
				</Panel>
			)}

			{/* ── Pending Requests ──────────────────────────────────────────── */}
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

			{/* ── Master Borrowing Database ─────────────────────────────────── */}
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
						{
							header: 'Action',
							accessor: (row: Equipment) => (
								<Button
									size="sm"
									variant="ghost"
									className="text-success border-success"
									onClick={() => {
										const session = buildReturnSession(row.borrower_username!, 'manual')
										if (session) setReturnSession(session)
										else alert('No borrowed items found for this user.')
									}}
								>
									RETURN
								</Button>
							),
						},
					]}
					data={borrowedItems}
					emptyMessage="No items currently borrowed."
				/>
			</Panel>

			{/* ── Manual Return Lookup ──────────────────────────────────────── */}
			<Panel>
				<h3 className="font-bold font-mono text-base mb-1">Manual Return Lookup</h3>
				<p className="text-xs text-muted font-mono mb-3">
					Select a borrower to open the return form without scanning a QR code.
				</p>
				<select
					value={manualReturnUser}
					onChange={e => setManualReturnUser(e.target.value)}
					className="w-full px-3.5 py-3.5 bg-white text-gray-800 border border-border rounded font-mono text-sm mb-3 focus:outline-none focus:border-primary"
				>
					<option value="">-- Select Borrower --</option>
					{activeBorrowers.map(u => {
						const p = profiles.find(pr => pr.username === u)
						const itemCount = borrowedItems.filter(e => e.borrower_username === u).length
						return (
							<option key={u} value={u}>
								{p?.full_name ?? u} (@{u}) — {itemCount} item{itemCount !== 1 ? 's' : ''}
							</option>
						)
					})}
				</select>
				<Button
					variant="success"
					fullWidth
					onClick={handleOpenManualReturn}
					disabled={!manualReturnUser}
				>
					OPEN RETURN FORM
				</Button>
			</Panel>

			{/* ── Inventory Overview ────────────────────────────────────────── */}
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

			{/* ── User Management ───────────────────────────────────────────── */}
			<Panel>
				<h3 className="font-bold font-mono text-base mb-3">User Management</h3>
				<DataTable
					columns={[
						{ header: 'Name', accessor: 'full_name' as keyof Profile },
						{ header: 'Username', accessor: 'username' as keyof Profile },
						{ header: 'Role', accessor: 'role' as keyof Profile },
						{
							header: 'Actions',
							accessor: (row: Profile) => {
								const isRootAdmin = row.username === 'admin'
								const isSelf = profile?.id === row.id

								if (isRootAdmin) return <span className="text-muted text-xs">Root</span>

								return (
									<div className="flex gap-1">
										{row.role !== 'admin' && (
											<Button
												size="sm" variant="ghost"
												className="text-success border-success"
												onClick={() => handleMakeAdmin(row.id, row.full_name)}
											>
												MAKE ADMIN
											</Button>
										)}
										{!isSelf && (
											<Button
												size="sm" variant="ghost"
												className="text-danger border-danger"
												onClick={() => handleRemoveUser(row.id)}
											>
												REMOVE
											</Button>
										)}
									</div>
								)
							},
						},
					]}
					data={profiles}
					emptyMessage="No users found."
				/>
			</Panel>

			{/* ── Inventory Management ──────────────────────────────────────── */}
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
