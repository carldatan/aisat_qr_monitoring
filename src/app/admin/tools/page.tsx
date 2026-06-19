'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, format } from 'date-fns'
import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { QRScanner } from '@/components/scanner/QRScanner'
import { QRCodeCanvas } from 'qrcode.react'
import {
	Activity,
	BadgePlus,
	BookOpen,
	CalendarClock,
	Camera,
	ChartColumn,
	ClipboardList,
	Clock3,
	LayoutDashboard,
	Package2,
	ShieldCheck,
	Upload,
	UserCog,
	UserPlus,
	Users,
	X,
} from 'lucide-react'
import {
	addEquipmentBatch,
	addHistoryLog,
	addScannedLibrary,
	adminBorrowItems,
	deleteProfile,
	returnItemsPartial,
	updateProfileRole,
} from '@/lib/db'
import { createAdminAccount } from '@/lib/auth'
import { formatDateOnly, formatDateTime } from '@/lib/utils'
import { isPrivilegedRole, isSuperAdminRole } from '@/lib/roles'
import type { Equipment, EquipmentStatus, Profile } from '@/types'

interface ReturnItem {
	baseName: string
	totalBorrowed: number
	returnQty: number
	lenderUsername: string
	category: string
	location: string
	returnLocation: string
}

interface ReturnSession {
	borrowerKey: string
	fullName: string
	idNumber: string
	items: ReturnItem[]
}

interface InventoryGroup {
	name: string
	category: string
	location: string
	status: EquipmentStatus
	borrower: string
	lender: string
	count: number
}

const EQUIPMENT_STATUSES: EquipmentStatus[] = [
	'Available',
	'Borrowed',
	'Maintenance',
	'Lost',
]

const RETURN_QR_PREFIX = 'AISAT_RETURN|'

function getDefaultReturnByDate() {
	return format(addDays(new Date(), 7), 'yyyy-MM-dd')
}

async function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result))
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

function PhotoInput({
	label,
	value,
	onChange,
}: {
	label: string
	value: string
	onChange: (value: string) => void
}) {
	const uploadInputRef = useRef<HTMLInputElement | null>(null)
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const [cameraOpen, setCameraOpen] = useState(false)
	const [cameraError, setCameraError] = useState('')

	const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return
		onChange(await fileToDataUrl(file))
		event.target.value = ''
	}

	useEffect(() => {
		if (!cameraOpen) {
			streamRef.current?.getTracks().forEach(track => track.stop())
			streamRef.current = null
			return
		}

		let cancelled = false

		const startCamera = async () => {
			setCameraError('')

			if (!navigator.mediaDevices?.getUserMedia) {
				setCameraError('Camera access is not supported in this browser.')
				return
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: { ideal: 'environment' } },
					audio: false,
				})

				if (cancelled) {
					stream.getTracks().forEach(track => track.stop())
					return
				}

				streamRef.current = stream
				if (videoRef.current) {
					videoRef.current.srcObject = stream
					await videoRef.current.play()
				}
			} catch (error) {
				console.error(error)
				setCameraError('Could not open the device camera.')
			}
		}

		startCamera()

		return () => {
			cancelled = true
		}
	}, [cameraOpen])

	const closeCamera = () => {
		streamRef.current?.getTracks().forEach(track => track.stop())
		streamRef.current = null
		setCameraOpen(false)
		setCameraError('')
	}

	const captureCameraPhoto = () => {
		const video = videoRef.current
		if (!video) return

		const canvas = document.createElement('canvas')
		canvas.width = video.videoWidth || 1280
		canvas.height = video.videoHeight || 720
		const context = canvas.getContext('2d')
		if (!context) return

		context.drawImage(video, 0, 0, canvas.width, canvas.height)
		onChange(canvas.toDataURL('image/png'))
		closeCamera()
	}

	return (
		<div className="flex flex-col gap-2">
			<label className="text-xs font-bold font-mono text-gray-500">
				{label}
			</label>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => setCameraOpen(true)}
				>
					<Camera className="mr-2 h-4 w-4" />
					TAKE PHOTO
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => uploadInputRef.current?.click()}
				>
					<Upload className="mr-2 h-4 w-4" />
					UPLOAD
				</Button>
				{value && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => onChange('')}
					>
						<X className="mr-2 h-4 w-4" />
						CLEAR
					</Button>
				)}
			</div>
			<input
				ref={uploadInputRef}
				type="file"
				accept="image/*"
				onChange={handleChange}
				className="hidden"
			/>
			{cameraOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
					<div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-xl">
						<div className="mb-3 flex items-center justify-between gap-3">
							<div>
								<p className="font-mono text-sm font-bold">{label}</p>
								<p className="text-xs text-muted font-mono">Use the device camera or cancel to close.</p>
							</div>
							<Button type="button" variant="ghost" size="sm" onClick={closeCamera}>
								<X className="h-4 w-4" />
							</Button>
						</div>
						{cameraError ? (
							<p className="mb-3 rounded border border-danger bg-red-50 p-3 text-sm font-mono text-danger">
								{cameraError}
							</p>
						) : (
							<>
								<video
									ref={videoRef}
									autoPlay
									playsInline
									muted
									className="w-full rounded-lg border border-border bg-black"
								/>
								<div className="mt-3 flex gap-2">
									<Button type="button" variant="success" fullWidth onClick={captureCameraPhoto}>
										CAPTURE
									</Button>
									<Button type="button" variant="outline" fullWidth onClick={closeCamera}>
										CANCEL
									</Button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
			{value && (
				<img
					src={value}
					alt={label}
					className="h-24 w-24 rounded border border-border object-cover"
				/>
			)}
		</div>
	)
}

export default function AdminToolsPage() {
	const router = useRouter()
	const profile = useAppStore(s => s.profile)
	const equipment = useAppStore(s => s.equipment)
	const profiles = useAppStore(s => s.profiles)
	const refreshAll = useAppStore(s => s.refreshAll)

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

	const [manualReturnUser, setManualReturnUser] = useState('')
	const [returnSession, setReturnSession] = useState<ReturnSession | null>(null)
	const [returnItemPhoto, setReturnItemPhoto] = useState('')
	const [borrowerReturnPhoto, setBorrowerReturnPhoto] = useState('')
	const [returnLoading, setReturnLoading] = useState(false)

	const [eqName, setEqName] = useState('')
	const [eqQty, setEqQty] = useState('')
	const [eqCategory, setEqCategory] = useState('')
	const [eqLocation, setEqLocation] = useState('')
	const [eqStatus, setEqStatus] = useState<EquipmentStatus>('Available')
	const [addLoading, setAddLoading] = useState(false)
	const previewReturnByDate = returnByDate || getDefaultReturnByDate()
	const [selectedProfileId, setSelectedProfileId] = useState('')
	const [selectedProfileRole, setSelectedProfileRole] = useState<'super_admin' | 'admin' | 'user'>('admin')
	const [profileActionLoading, setProfileActionLoading] = useState(false)
	const [createUsername, setCreateUsername] = useState('')
	const [createFullName, setCreateFullName] = useState('')
	const [createIdNumber, setCreateIdNumber] = useState('')
	const [createPassword, setCreatePassword] = useState('')
	const [createRole, setCreateRole] = useState<'admin' | 'user' | 'super_admin'>('admin')
	const [createLoading, setCreateLoading] = useState(false)

	useEffect(() => {
		if (profile && !isPrivilegedRole(profile.role)) {
			router.replace('/dashboard')
		}
	}, [profile, router])

	useEffect(() => {
		setReturnQrSaved(false)
	}, [borrowerIdNumber])

	const availableGroups = useMemo(() => {
		const map = new Map<string, {
			baseName: string
			category: string
			location: string
			count: number
		}>()

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

		return Array.from(map.values()).sort((a, b) =>
			a.baseName.localeCompare(b.baseName)
		)
	}, [equipment])

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

	const inventoryGroups = useMemo(() => {
		const map = new Map<string, InventoryGroup>()

		equipment.forEach(e => {
			const key = [
				e.base_name,
				e.category ?? '',
				e.location ?? '',
				e.status,
				e.borrower_name ?? '',
				e.lender_username ?? '',
			].join('|')
			const existing = map.get(key)
			if (existing) existing.count++
			else {
				map.set(key, {
					name: e.base_name,
					category: e.category ?? '',
					location: e.location ?? '',
					status: e.status,
					borrower: e.borrower_name ?? '',
					lender: e.lender_username ?? '',
					count: 1,
				})
			}
		})

		return Array.from(map.values())
	}, [equipment])

	const selectedAvailable = availableGroups.find(group =>
		`${group.baseName}|${group.category}|${group.location}` === borrowGroupKey
	)
	useEffect(() => {
		setReturnLocation(selectedAvailable?.location ?? '')
	}, [selectedAvailable?.location, borrowGroupKey])
	const returnQrValue = borrowerIdNumber
		? `${RETURN_QR_PREFIX}${borrowerIdNumber.trim()}`
		: ''
	const totalReturning =
		returnSession?.items.reduce((sum, item) => sum + item.returnQty, 0) ?? 0
	const canManageProfiles = isSuperAdminRole(profile?.role)
	const selectedProfile = profiles.find(item => item.id === selectedProfileId) ?? null
	const adminProfiles = profiles.filter(item => item.role === 'admin' || item.role === 'super_admin')
	const superAdminCount = profiles.filter(item => item.role === 'super_admin').length

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
						? {
							...item,
							returnQty: Math.max(0, Math.min(newQty, item.totalBorrowed)),
						}
						: item
				),
			}
		})
	}

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

	const handleCreateAccount = async () => {
		if (!profile || !canManageProfiles) return

		const normalizedUsername = createUsername.trim()
		const normalizedFullName = createFullName.trim()
		const normalizedIdNumber = createIdNumber.trim()

		if (!normalizedUsername || !normalizedFullName || !normalizedIdNumber || !createPassword) {
			alert('Fill in the account fields.')
			return
		}

		setCreateLoading(true)
		try {
			await createAdminAccount({
				username: normalizedUsername,
				full_name: normalizedFullName,
				id_number: normalizedIdNumber,
				password: createPassword,
				role: createRole,
			})
			setCreateUsername('')
			setCreateFullName('')
			setCreateIdNumber('')
			setCreatePassword('')
			setCreateRole('admin')
			await refreshAll()
			alert(`Created @${normalizedUsername} as ${createRole.replace('_', ' ')}.`)
		} catch (error) {
			console.error(error)
			alert(error instanceof Error ? error.message : 'Error creating account.')
		} finally {
			setCreateLoading(false)
		}
	}

	const handleSaveProfileRole = async () => {
		if (!profile || !canManageProfiles) return
		if (!selectedProfileId) {
			alert('Select a profile to manage.')
			return
		}
		if (selectedProfileId === profile.id) {
			alert('You cannot change your own account from this screen.')
			return
		}

		const target = profiles.find(item => item.id === selectedProfileId)
		if (!target) {
			alert('Selected profile was not found.')
			return
		}

		if (target.role === 'super_admin' && selectedProfileRole !== 'super_admin' && superAdminCount <= 1) {
			alert('At least one super admin must remain.')
			return
		}

		setProfileActionLoading(true)
		try {
			await updateProfileRole(selectedProfileId, selectedProfileRole)
			await refreshAll()
			alert(`Updated ${target.username} to ${selectedProfileRole.replace('_', ' ')}.`)
		} catch (error) {
			console.error(error)
			alert('Error updating profile role.')
		} finally {
			setProfileActionLoading(false)
		}
	}

	const handleDeleteProfile = async () => {
		if (!profile || !canManageProfiles) return
		if (!selectedProfileId) {
			alert('Select a profile to delete.')
			return
		}
		if (selectedProfileId === profile.id) {
			alert('You cannot delete your own account from this screen.')
			return
		}

		const target = profiles.find(item => item.id === selectedProfileId)
		if (!target) {
			alert('Selected profile was not found.')
			return
		}
		if (target.role === 'super_admin' && superAdminCount <= 1) {
			alert('At least one super admin must remain.')
			return
		}
		if (!confirm(`Delete ${target.full_name} (@${target.username})? This only removes the profile row.`)) {
			return
		}

		setProfileActionLoading(true)
		try {
			await deleteProfile(selectedProfileId)
			await refreshAll()
			setSelectedProfileId('')
			alert(`Deleted ${target.username}.`)
		} catch (error) {
			console.error(error)
			alert('Error deleting profile.')
		} finally {
			setProfileActionLoading(false)
		}
	}

	return (
		<>
			<Panel id="return-transaction">
				<h3 className="mb-3 flex items-center gap-2 font-bold font-mono text-lg">
					<ClipboardList className="h-5 w-5 text-primary" />
					Borrow Transaction
				</h3>
				<div className="grid gap-3 md:grid-cols-2">
					<div className="relative w-full">
						<select
							value={borrowGroupKey}
							onChange={event => setBorrowGroupKey(event.target.value)}
							className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-sm font-mono"
						>
							<option value="">Select equipment</option>
							{availableGroups.map(group => (
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
							Default return by: {formatDateOnly(`${previewReturnByDate}T00:00:00`)}
						</p>
					</div>
				)}
				<div className="grid gap-4 md:grid-cols-2 mt-4">
					<PhotoInput
						label="Borrow Item Picture"
						value={borrowItemPhoto}
						onChange={setBorrowItemPhoto}
					/>
					<PhotoInput
						label="Borrower Picture"
						value={borrowerBorrowPhoto}
						onChange={setBorrowerBorrowPhoto}
					/>
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
								<h4 className="font-bold font-mono text-sm">
									Return QR Code
								</h4>
								<p className="mt-1 text-xs font-mono text-muted">
									Borrower: {borrowerName || '--'} | ID: {borrowerIdNumber.trim()}
								</p>
								<div className="mt-3 flex flex-col gap-2 sm:flex-row">
									<Button
										type="button"
										variant="ghost"
										onClick={handleDownloadReturnQr}
									>
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

			<Panel>
				<h3 className="mb-3 flex items-center gap-2 font-bold font-mono text-lg">
					<Clock3 className="h-5 w-5 text-primary" />
					Return Transaction
				</h3>
				<div className="mb-5 rounded border border-border p-4">
					<h4 className="mb-3 font-bold font-mono text-sm">
						Scan Borrower Return QR
					</h4>
					<QRScanner onScanSuccess={handleReturnQrScan} />
				</div>
				<div className="flex flex-col gap-3 md:flex-row">
					<select
						value={manualReturnUser}
						onChange={event => setManualReturnUser(event.target.value)}
						className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-sm font-mono"
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

				{returnSession && (
					<div className="mt-5 rounded border border-border p-4">
						<div className="mb-3 flex items-start justify-between gap-3">
							<div>
								<h4 className="font-bold font-mono text-success">
									{returnSession.fullName}
								</h4>
								<p className="text-xs font-mono text-muted">
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
						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-sm font-mono">
								<thead>
									<tr>
										<th className="border border-gray-100 bg-surface px-3 py-2 text-left">Item</th>
										<th className="border border-gray-100 bg-surface px-3 py-2 text-left">Details</th>
										<th className="border border-gray-100 bg-surface px-3 py-2 text-left">Return Location</th>
										<th className="border border-gray-100 bg-surface px-3 py-2 text-left">Borrowed</th>
										<th className="border border-gray-100 bg-surface px-3 py-2 text-left">Return Qty</th>
									</tr>
								</thead>
								<tbody>
									{returnSession.items.map((item, index) => (
										<tr key={`${item.baseName}-${item.lenderUsername}-${index}`}>
											<td className="border border-gray-100 px-3 py-2">{item.baseName}</td>
											<td className="border border-gray-100 px-3 py-2 text-xs text-muted">
												{item.category || 'Uncategorized'} | {item.location || 'Unassigned'} | Lender: @{item.lenderUsername || profile?.username}
											</td>
											<td className="border border-gray-100 px-3 py-2 text-xs text-muted">
												{item.returnLocation || item.location || 'Unassigned'}
											</td>
											<td className="border border-gray-100 px-3 py-2">{item.totalBorrowed}</td>
											<td className="border border-gray-100 px-3 py-2">
												<input
													type="number"
													min={0}
													max={item.totalBorrowed}
													value={item.returnQty}
													onChange={event => updateReturnQty(index, parseInt(event.target.value, 10) || 0)}
													className="w-20 rounded border border-border px-2 py-1"
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="grid gap-4 md:grid-cols-2 mt-4">
							<PhotoInput
								label="Return Item Picture"
								value={returnItemPhoto}
								onChange={setReturnItemPhoto}
							/>
							<PhotoInput
								label="Return Borrower Picture"
								value={borrowerReturnPhoto}
								onChange={setBorrowerReturnPhoto}
							/>
						</div>
						<Button
							className="mt-4"
							variant="success"
							fullWidth
							onClick={handleConfirmReturn}
							disabled={returnLoading || totalReturning === 0}
						>
							{returnLoading ? 'RECORDING...' : `CONFIRM RETURN (${totalReturning})`}
						</Button>
					</div>
				)}
			</Panel>

			<Panel>
				<h3 className="mb-3 flex items-center gap-2 font-bold font-mono text-lg">
					<Package2 className="h-5 w-5 text-primary" />
					Inventory Management
				</h3>
				<div className="grid gap-3 md:grid-cols-2">
					<Input
						label="Equipment Name"
						value={eqName}
						onChange={event => setEqName(event.target.value)}
					/>
					<Input
						type="number"
						label="Quantity"
						value={eqQty}
						onChange={event => setEqQty(event.target.value)}
					/>
					<Input
						label="Equipment Category"
						value={eqCategory}
						onChange={event => setEqCategory(event.target.value)}
					/>
					<Input
						label="Equipment Location"
						value={eqLocation}
						onChange={event => setEqLocation(event.target.value)}
					/>
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
				<Button
					className="mt-4"
					fullWidth
					onClick={handleAddEquipment}
					disabled={addLoading}
				>
					{addLoading ? 'ADDING...' : 'ADD EQUIPMENT'}
				</Button>
			</Panel>

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
						{ header: 'Status', accessor: 'status' as keyof InventoryGroup },
						{ header: 'Qty', accessor: 'count' as keyof InventoryGroup },
						{
							header: 'Borrower',
							accessor: (row: InventoryGroup) => row.borrower || '--',
						},
						{
							header: 'Lender',
							accessor: (row: InventoryGroup) => row.lender ? `@${row.lender}` : '--',
						},
					]}
					data={inventoryGroups}
					emptyMessage="No equipment in inventory."
				/>
			</Panel>

			{canManageProfiles && (
				<Panel>
					<h3 className="mb-2 flex items-center gap-2 font-bold font-mono text-lg">
						<ShieldCheck className="h-5 w-5 text-primary" />
						Super Admin Console
					</h3>
					<p className="text-base font-mono text-muted mb-5">
						Create new accounts and manage admin roles from one place.
					</p>

					<div className="grid gap-5 xl:grid-cols-2">
						<div className="rounded-xl border border-border bg-surface/50 p-4">
							<h4 className="mb-4 flex items-center gap-2 font-bold font-mono text-base">
								<UserPlus className="h-5 w-5 text-primary" />
								Create Account
							</h4>
							<div className="grid gap-3 md:grid-cols-2">
								<Input
									label="Username"
									value={createUsername}
									onChange={event => setCreateUsername(event.target.value)}
								/>
								<Input
									label="Full Name"
									value={createFullName}
									onChange={event => setCreateFullName(event.target.value)}
								/>
								<Input
									label="ID Number"
									value={createIdNumber}
									onChange={event => setCreateIdNumber(event.target.value)}
								/>
								<Input
									label="Temporary Password"
									type="password"
									value={createPassword}
									onChange={event => setCreatePassword(event.target.value)}
								/>
								<select
									value={createRole}
									onChange={event => setCreateRole(event.target.value as 'admin' | 'super_admin')}
									className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-base font-mono md:col-span-2"
								>
									<option value="admin">Admin</option>
									<option value="super_admin">Super Admin</option>
								</select>
							</div>
							<Button
								className="mt-4"
								fullWidth
								onClick={handleCreateAccount}
								disabled={createLoading}
							>
								{createLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
							</Button>
						</div>

						<div className="rounded-xl border border-border bg-surface/50 p-4">
							<h4 className="mb-4 flex items-center gap-2 font-bold font-mono text-base">
								<UserCog className="h-5 w-5 text-primary" />
								Manage Admin Accounts
							</h4>
							<div className="grid gap-3">
								<select
									value={selectedProfileId}
									onChange={event => {
										const nextId = event.target.value
										setSelectedProfileId(nextId)
										const nextProfile = profiles.find(item => item.id === nextId)
										setSelectedProfileRole(nextProfile?.role ?? 'admin')
									}}
									className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-base font-mono"
								>
									<option value="">Select profile</option>
									{profiles
										.filter(item => item.id !== profile?.id)
										.sort((a, b) => a.username.localeCompare(b.username))
										.map(item => (
											<option key={item.id} value={item.id}>
												{item.full_name} (@{item.username}) - {item.role}
											</option>
										))}
								</select>
								<select
									value={selectedProfileRole}
									onChange={event => setSelectedProfileRole(event.target.value as 'super_admin' | 'admin' | 'user')}
									className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-base font-mono"
								>
									<option value="admin">Admin</option>
									<option value="user">User</option>
									<option value="super_admin">Super Admin</option>
								</select>
								<div className="flex gap-2">
									<Button
										fullWidth
										onClick={handleSaveProfileRole}
										disabled={profileActionLoading || !selectedProfileId}
									>
										{profileActionLoading ? 'SAVING...' : 'SAVE ROLE'}
									</Button>
									<Button
										variant="danger"
										fullWidth
										onClick={handleDeleteProfile}
										disabled={profileActionLoading || !selectedProfileId}
									>
										DELETE
									</Button>
								</div>
								{selectedProfile && (
									<p className="text-sm font-mono text-muted">
										Selected: {selectedProfile.full_name} (@{selectedProfile.username}) | Current role: {selectedProfile.role}
									</p>
								)}
							</div>
						</div>
					</div>

					<div className="mt-5">
						<DataTable
							columns={[
								{ header: 'Name', accessor: (row: Profile) => row.full_name },
								{ header: 'Username', accessor: (row: Profile) => `@${row.username}` },
								{ header: 'ID Number', accessor: 'id_number' as keyof Profile },
								{ header: 'Role', accessor: 'role' as keyof Profile },
								{
									header: 'Created',
									accessor: (row: Profile) => formatDateTime(row.created_at),
								},
							]}
							data={adminProfiles}
							emptyMessage="No admin accounts found."
						/>
					</div>
				</Panel>
			)}

			<Panel>
				<h3 className="mb-3 flex items-center gap-2 font-bold font-mono text-lg">
					<BookOpen className="h-5 w-5 text-primary" />
					Borrowed Equipment
				</h3>
				<DataTable
					columns={[
						{ header: 'Equipment', accessor: 'base_name' as keyof Equipment },
						{
							header: 'Borrower',
							accessor: (row: Equipment) => row.borrower_name || row.borrower_username || '--',
						},
						{
							header: 'ID Number',
							accessor: (row: Equipment) => row.borrower_id_number || '--',
						},
						{
							header: 'Borrow Date',
							accessor: (row: Equipment) => row.borrow_time ? formatDateTime(row.borrow_time) : '--',
						},
						{
							header: 'Return By',
							accessor: (row: Equipment) => row.return_by_date ? formatDateOnly(row.return_by_date) : '--',
						},
						{
							header: 'Lender',
							accessor: (row: Equipment) => row.lender_username ? `@${row.lender_username}` : '--',
						},
					]}
					data={borrowedItems}
					emptyMessage="No active borrowed equipment."
				/>
			</Panel>
		</>
	)
}
