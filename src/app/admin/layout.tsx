'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/admin/Sidebar'
import { useAppStore } from '@/contexts/store'
import { createClient } from '@/lib/supabase/client'
import { getProfile } from '@/lib/db'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { setProfile } = useAppStore()

  useEffect(() => {
    const supabase = createClient()

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const profile = await getProfile(user.id)
      if (!profile) { router.replace('/login'); return }

      setProfile(profile)
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
    <div className="flex min-h-screen bg-[#EEF1F6]">
      <Sidebar />
      <main className="flex-1 ml-[220px] p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
