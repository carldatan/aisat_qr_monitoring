// ─── Database row types (match Supabase schema) ───────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'user'

export interface Profile {
	id: string               // UUID, matches auth.users.id
	username: string
	full_name: string
	id_number: string
	role: UserRole
	created_at: string
	updated_at: string
}

export type EquipmentStatus = 'Available' | 'Pending' | 'Borrowed' | 'Maintenance' | 'Lost'

export interface Equipment {
	id: string               // UUID
	base_name: string
	category: string | null
	location: string | null
	return_location: string | null
	status: EquipmentStatus
	borrower_id: string | null   // FK → profiles.id
	borrower_username: string | null
	borrower_name: string | null
	borrower_id_number: string | null
	lender_username: string | null
	borrow_item_photo_url: string | null
	borrower_borrow_photo_url: string | null
	return_item_photo_url: string | null
	borrower_return_photo_url: string | null
	borrow_time: string | null
	return_by_date: string | null
	return_time: string | null
	created_at: string
	updated_at: string
}

export interface HistoryLog {
	id: string
	user_id: string | null
	username: string
	item: string
	event: string
	description: string | null
	item_photo_url: string | null
	borrower_photo_url: string | null
	created_at: string
}

export interface ScannedLibrary {
	id: string
	scan_time: string
	student_name: string
	student_id_number: string
	items_count: number
	processed_by: string | null  // admin username
	created_at: string
}

// ─── UI / derived types ───────────────────────────────────────────────────────

export interface InventoryGroup {
	name: string
	count: number
	status: EquipmentStatus
	user: string | null
}

export interface PendingGroup {
	username: string
	itemName: string
	count: number
}

export interface BorrowCartItem {
	baseName: string
	quantity: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
	username: string
	password: string
}

export interface SignupCredentials {
	username: string
	full_name: string
	id_number: string
	password: string
}
