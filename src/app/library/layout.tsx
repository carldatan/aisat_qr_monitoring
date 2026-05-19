'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppNav } from '@/components/layout/AppNav'
import { useAppStore } from '@/contexts/store'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/lib/db'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { setProfile, refreshAll } = useAppStore()

  useEffect(() => {
    const supabase = createClient()

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const profile = await getProfile(user.id)
      if (!profile) { router.replace('/login'); return }

      setProfile(profile)
      await refreshAll()
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null)
          router.replace('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <AppNav />
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
