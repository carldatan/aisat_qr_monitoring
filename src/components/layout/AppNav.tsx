'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/contexts/store'
import { cn } from '@/lib/utils'
import { isPrivilegedRole } from '@/lib/roles'
import { LayoutDashboard, LibraryBig, Settings2 } from 'lucide-react'

export function AppNav() {
  const pathname = usePathname()
  const profile = useAppStore(s => s.profile)

  const isAdmin = isPrivilegedRole(profile?.role)

  const tabs = [
    { label: 'Dashboard', href: '/dashboard', show: true, icon: LayoutDashboard },
    { label: 'Library', href: '/library', show: isAdmin, icon: LibraryBig },
    { label: 'Admin Tools', href: '/admin', show: isAdmin, icon: Settings2 },
  ]

  return (
    <nav className="flex gap-2.5 px-8 py-4 border-b border-border bg-white">
      {tabs
        .filter(t => t.show)
        .map(tab => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold font-mono rounded border transition-colors',
                active
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-gray-600 border-border hover:bg-gray-100'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
    </nav>
  )
}
