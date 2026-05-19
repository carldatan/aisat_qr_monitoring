// ─── Database row types (match Supabase schema) ───────────────────────────────

export type UserRole = 'admin' | 'user'

export interface Profile {
	id: string               // UUID, matches auth.users.id
	username: string
	full_name: string
	id_number: string
	role: UserRole
	created_at: string
	updated_at: string
}

export type EquipmentStatus = 'Available' | 'Pending' | 'Borrowed'

export interface Equipment {
	id: string               // UUID
	base_name: string
	status: EquipmentStatus
	borrower_id: string | null   // FK → profiles.id
	borrower_username: string | null
	borrow_time: string | null
	created_at: string
	updated_at: string
}

export interface HistoryLog {
	id: string
	user_id: string | null
	username: string
	item: string
	event: string
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
