'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/contexts/store'
import {
  LayoutDashboard,
  Monitor,
  ClipboardList,
  Activity,
  Globe,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/tools', label: 'Equipment', icon: Monitor },
  { href: '/library', label: 'Records', icon: ClipboardList },
  { href: '/admin/logs', label: 'Logs', icon: Activity },
]

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
        active
          ? 'bg-white/25 text-white font-bold'
          : 'text-white/75 hover:text-white hover:bg-white/15'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const profile = useAppStore(s => s.profile)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleLogout = async () => {
    await logout()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col bg-[#3B5BFF]">
      <div className="flex items-center gap-3 px-5 pt-6 pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <Globe className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-base font-bold text-white leading-tight">AISAT</div>
          <div className="text-xs text-white/70">College</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 pb-4">
        {navItems.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-3 px-3 text-xs text-white/70 truncate font-medium">
          {profile?.full_name ?? 'User'}
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/15 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
