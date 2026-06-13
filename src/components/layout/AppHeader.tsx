'use client'

import { useAppStore } from '@/contexts/store'
import { logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { ShieldCheck, LogOut } from 'lucide-react'

export function AppHeader() {
	const router = useRouter()
	const profile = useAppStore(s => s.profile)

	const handleLogout = async () => {
		await logout()
		router.push('/login')
		router.refresh()
	}

	return (
		<header className="px-8 py-5 border-b border-border flex justify-between items-center bg-white sticky top-0 z-50">
			<div className="flex items-center gap-3">
				<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
					<ShieldCheck className="h-6 w-6" />
				</div>
				<h1 className="text-2xl font-mono font-bold text-primary tracking-wide">
					AISAT COLLEGE DASMA
				</h1>
			</div>
			<div className="text-base font-mono text-muted">
				Welcome, {profile?.full_name ?? 'User'}!
			</div>
			<div className="flex items-center gap-3">
				{profile && (
					<span className="text-success text-base font-mono">
						{profile.full_name} (@{profile.username})
					</span>
				)}
				<button
					onClick={handleLogout}
					className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold font-mono text-danger border border-danger rounded hover:bg-red-50 transition-colors"
				>
					<LogOut className="h-4 w-4" />
					LOGOUT
				</button>
			</div>
		</header>
	)
}
