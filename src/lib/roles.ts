import type { UserRole } from '@/types'

export function isPrivilegedRole(role: UserRole | null | undefined): role is Exclude<UserRole, 'user'> {
	return role === 'admin' || role === 'super_admin'
}

export function isSuperAdminRole(role: UserRole | null | undefined): role is 'super_admin' {
	return role === 'super_admin'
}
