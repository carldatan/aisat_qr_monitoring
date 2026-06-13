import { createClient } from '@/lib/supabase/client'
import type {
	Profile, Equipment, HistoryLog, ScannedLibrary,
	EquipmentStatus, BorrowCartItem,
} from '@/types'

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
	const supabase = createClient()
	const { data, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', userId)
		.single()
	if (error) { console.error('getProfile:', error); return null }
	return data
}

export async function getAllProfiles(): Promise<Profile[]> {
	const supabase = createClient()
	const { data, error } = await supabase
		.from('profiles')
		.select('*')
		.order('created_at', { ascending: true })
	if (error) { console.error('getAllProfiles:', error); return [] }
	return data ?? []
}

export async function updateProfileRole(userId: string, role: 'super_admin' | 'admin' | 'user') {
	const supabase = createClient()
	const { error } = await supabase
		.from('profiles')
		.update({ role, updated_at: new Date().toISOString() })
		.eq('id', userId)
	if (error) throw error
}

export async function deleteProfile(userId: string) {
	const supabase = createClient()
	// Deleting from profiles will cascade; actual auth user deletion requires service role
	const { error } = await supabase.from('profiles').delete().eq('id', userId)
	if (error) throw error
}

// ─── Equipment ────────────────────────────────────────────────────────────────

export async function getAllEquipment(): Promise<Equipment[]> {
	const supabase = createClient()
	const { data, error } = await supabase
		.from('equipment')
		.select('*')
		.order('base_name', { ascending: true })
	if (error) { console.error('getAllEquipment:', error); return [] }
	return data ?? []
}

export async function addEquipmentBatch(
	baseName: string,
	quantity: number,
	category = '',
	location = '',
	status: EquipmentStatus = 'Available'
) {
	const supabase = createClient()
	const rows = Array.from({ length: quantity }, () => ({
		base_name: baseName,
		category,
		location,
		return_location: null,
		status,
		borrower_id: null,
		borrower_username: null,
		borrower_name: null,
		borrower_id_number: null,
		lender_username: null,
		borrow_item_photo_url: null,
		borrower_borrow_photo_url: null,
		return_item_photo_url: null,
		borrower_return_photo_url: null,
		borrow_time: null,
		return_by_date: null,
		return_time: null,
	}))
	const { error } = await supabase.from('equipment').insert(rows)
	if (error) throw error
}

export async function adminBorrowItems(entry: {
	baseName: string
	category: string
	location: string
	returnLocation: string
	quantity: number
	borrowerName: string
	borrowerIdNumber: string
	lenderUsername: string
	itemPhotoUrl: string
	borrowerPhotoUrl: string
	returnByDate: string
}) {
	const supabase = createClient()
	const time = new Date().toISOString()

	let query = supabase
		.from('equipment')
		.select('id')
		.eq('base_name', entry.baseName)
		.eq('status', 'Available')
		.limit(entry.quantity)

	query = query.eq('category', entry.category)
	query = query.eq('location', entry.location)

	const { data: available, error: fetchErr } = await query

	if (fetchErr) throw fetchErr
	if (!available || available.length < entry.quantity) {
		throw new Error(`${entry.baseName} has less available quantity than requested.`)
	}

	const { error } = await supabase
		.from('equipment')
		.update({
			status: 'Borrowed',
			borrower_id: null,
			borrower_username: entry.borrowerIdNumber,
			borrower_name: entry.borrowerName,
			borrower_id_number: entry.borrowerIdNumber,
			lender_username: entry.lenderUsername,
			return_location: entry.returnLocation,
			borrow_item_photo_url: entry.itemPhotoUrl,
			borrower_borrow_photo_url: entry.borrowerPhotoUrl,
			return_item_photo_url: null,
			borrower_return_photo_url: null,
			borrow_time: time,
			return_by_date: entry.returnByDate,
			return_time: null,
			updated_at: time,
		})
		.in('id', available.map(e => e.id))

	if (error) throw error
	return available.length
}

export async function requestBorrowItems(
	items: BorrowCartItem[],
	userId: string,
	username: string
) {
	const supabase = createClient()

	for (const item of items) {
		if (item.quantity <= 0) continue

		// Get available items up to requested quantity
		const { data: available, error: fetchErr } = await supabase
			.from('equipment')
			.select('id')
			.eq('base_name', item.baseName)
			.eq('status', 'Available')
			.limit(item.quantity)

		if (fetchErr) throw fetchErr
		if (!available || available.length < item.quantity) {
			alert(`${item.baseName} has less available quantities than requested`)
			continue
		}

		const ids = available.map(e => e.id)
		const { error: updateErr } = await supabase
			.from('equipment')
			.update({
				status: 'Pending',
				borrower_id: userId,
				borrower_username: username,
				updated_at: new Date().toISOString(),
			})
			.in('id', ids)

		if (updateErr) throw updateErr
	}
}

export async function approveRequest(
	borrowerUsername: string,
	itemName: string
) {
	const supabase = createClient()
	const time = new Date().toISOString()
	const { error } = await supabase
		.from('equipment')
		.update({
			status: 'Borrowed',
			borrow_time: time,
			return_by_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			updated_at: time,
		})
		.eq('borrower_username', borrowerUsername)
		.eq('base_name', itemName)
		.eq('status', 'Pending')
	if (error) throw error
}

export async function disapproveRequest(
	borrowerUsername: string,
	itemName: string
) {
	const supabase = createClient()
	const { error } = await supabase
		.from('equipment')
		.update({
			status: 'Available',
			borrower_id: null,
			borrower_username: null,
			borrow_time: null,
			return_by_date: null,
			return_location: null,
			updated_at: new Date().toISOString(),
		})
		.eq('borrower_username', borrowerUsername)
		.eq('base_name', itemName)
		.eq('status', 'Pending')
	if (error) throw error
}

export async function returnItemsByUser(borrowerUsername: string): Promise<number> {
	const supabase = createClient()
	const { data: items, error: fetchErr } = await supabase
		.from('equipment')
		.select('id, location, return_location')
		.eq('borrower_username', borrowerUsername)
		.eq('status', 'Borrowed')
	if (fetchErr) throw fetchErr
	if (!items || items.length === 0) return 0

	const time = new Date().toISOString()
	for (const item of items) {
		const { error } = await supabase
			.from('equipment')
			.update({
				status: 'Available',
				borrower_id: null,
				borrower_username: null,
				borrow_time: null,
				return_by_date: null,
				location: item.return_location ?? item.location ?? null,
				return_location: null,
				updated_at: time,
			})
			.eq('id', item.id)
		if (error) throw error
	}
	return items.length
}

export async function returnItemsPartial(
	borrowerUsername: string,
	itemsToReturn: {
		baseName: string
		qty: number
		category?: string
		location?: string
		returnLocation?: string
		lenderUsername?: string
	}[],
	returnPhotos?: {
		itemPhotoUrl: string
		borrowerPhotoUrl: string
	}
): Promise<number> {
	const supabase = createClient()
	let totalReturned = 0
	const time = new Date().toISOString()

	for (const { baseName, qty, category, location, returnLocation, lenderUsername } of itemsToReturn) {
		if (qty <= 0) continue
		let query = supabase
			.from('equipment')
			.select('id')
			.eq('borrower_username', borrowerUsername)
			.eq('base_name', baseName)
			.eq('status', 'Borrowed')
			.limit(qty)

		if (typeof category === 'string') {
			query = query.eq('category', category)
		}
		if (typeof location === 'string') {
			query = query.eq('location', location)
		}
		if (typeof returnLocation === 'string') {
			query = query.eq('return_location', returnLocation)
		}
		if (typeof lenderUsername === 'string') {
			query = lenderUsername
				? query.eq('lender_username', lenderUsername)
				: query.is('lender_username', null)
		}

		const { data: targets, error: fetchErr } = await query
		if (fetchErr) throw fetchErr
		if (!targets || targets.length === 0) continue

		const { error } = await supabase
			.from('equipment')
			.update({
				status: 'Available',
				borrower_id: null,
				borrower_username: null,
				borrower_name: null,
				borrower_id_number: null,
				lender_username: null,
				location: returnLocation ?? location ?? null,
				return_location: null,
				return_item_photo_url: returnPhotos?.itemPhotoUrl ?? null,
				borrower_return_photo_url: returnPhotos?.borrowerPhotoUrl ?? null,
				borrow_time: null,
				return_by_date: null,
				return_time: time,
				updated_at: time,
			})
			.in('id', targets.map(t => t.id))
		if (error) throw error
		totalReturned += targets.length
	}
	return totalReturned
}

// ─── History Log ──────────────────────────────────────────────────────────────

export async function addHistoryLog(
	username: string,
	item: string,
	event: string,
	userId?: string,
	options?: {
		description?: string
		itemPhotoUrl?: string
		borrowerPhotoUrl?: string
	}
) {
	const supabase = createClient()
	const { error } = await supabase.from('history_logs').insert({
		user_id: userId ?? null,
		username,
		item,
		event,
		description: options?.description ?? null,
		item_photo_url: options?.itemPhotoUrl ?? null,
		borrower_photo_url: options?.borrowerPhotoUrl ?? null,
	})
	if (error) console.error('addHistoryLog:', error)
}

export async function getHistoryLogs(limit = 50): Promise<HistoryLog[]> {
	const supabase = createClient()
	const { data, error } = await supabase
		.from('history_logs')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(limit)
	if (error) { console.error('getHistoryLogs:', error); return [] }
	return data ?? []
}

export async function getHistoryLogsByUser(
	username: string,
	limit = 50
): Promise<HistoryLog[]> {
	const supabase = createClient()
	const { data, error } = await supabase
		.from('history_logs')
		.select('*')
		.eq('username', username)
		.order('created_at', { ascending: false })
		.limit(limit)
	if (error) { console.error('getHistoryLogsByUser:', error); return [] }
	return data ?? []
}

// ─── Scanned Library ──────────────────────────────────────────────────────────

export async function addScannedLibrary(entry: {
	studentName: string
	studentIdNumber: string
	itemsCount: number
	processedBy: string
}) {
	const supabase = createClient()
	const { error } = await supabase.from('scanned_library').insert({
		student_name: entry.studentName,
		student_id_number: entry.studentIdNumber,
		items_count: entry.itemsCount,
		processed_by: entry.processedBy,
		scan_time: new Date().toISOString(),
	})
	if (error) throw error
}

export async function getScannedLibrary(): Promise<ScannedLibrary[]> {
	const supabase = createClient()
	const { data, error } = await supabase
		.from('scanned_library')
		.select('*')
		.order('created_at', { ascending: false })
	if (error) { console.error('getScannedLibrary:', error); return [] }
	return data ?? []
}
