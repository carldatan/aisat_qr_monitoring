'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/contexts/store'
import { cn } from '@/lib/utils'

export function AppNav() {
  const pathname = usePathname()
  const profile = useAppStore(s => s.profile)

  const isAdmin = profile?.role === 'admin'

  const tabs = [
    { label: 'Dashboard', href: '/dashboard', show: true },
    { label: 'Library', href: '/library', show: isAdmin },
    { label: 'Admin Tools', href: '/admin', show: isAdmin },
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
                'px-4 py-2.5 text-sm font-bold font-mono rounded border transition-colors',
                active
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-gray-600 border-border hover:bg-gray-100'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
    </nav>
  )
}
