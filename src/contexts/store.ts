'use client'

import { create } from 'zustand'
import type { Profile, Equipment, HistoryLog, ScannedLibrary } from '@/types'
import {
  getAllEquipment, getAllProfiles, getHistoryLogs,
  getHistoryLogsByUser, getScannedLibrary,
} from '@/lib/db'

interface AppState {
  // Auth
  profile: Profile | null
  setProfile: (p: Profile | null) => void

  // Data
  equipment: Equipment[]
  profiles: Profile[]
  historyLogs: HistoryLog[]
  scannedLibrary: ScannedLibrary[]

  // Loading
  loading: boolean

  // Actions
  refreshEquipment: () => Promise<void>
  refreshProfiles: () => Promise<void>
  refreshHistory: (username?: string) => Promise<void>
  refreshLibrary: () => Promise<void>
  refreshAll: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  setProfile: (p) => set({ profile: p }),

  equipment: [],
  profiles: [],
  historyLogs: [],
  scannedLibrary: [],
  loading: false,

  refreshEquipment: async () => {
    const equipment = await getAllEquipment()
    set({ equipment })
  },

  refreshProfiles: async () => {
    const profiles = await getAllProfiles()
    set({ profiles })
  },

  refreshHistory: async (username?: string) => {
    const historyLogs = username
      ? await getHistoryLogsByUser(username)
      : await getHistoryLogs()
    set({ historyLogs })
  },

  refreshLibrary: async () => {
    const scannedLibrary = await getScannedLibrary()
    set({ scannedLibrary })
  },

  refreshAll: async () => {
    set({ loading: true })
    const { profile } = get()
    const isAdmin = profile?.role === 'admin'

    const [equipment, historyLogs] = await Promise.all([
      getAllEquipment(),
      isAdmin ? getHistoryLogs() : getHistoryLogsByUser(profile?.username ?? ''),
    ])

    const updates: Partial<AppState> = { equipment, historyLogs, loading: false }

    if (isAdmin) {
      const [profiles, scannedLibrary] = await Promise.all([
        getAllProfiles(),
        getScannedLibrary(),
      ])
      updates.profiles = profiles
      updates.scannedLibrary = scannedLibrary
    }

    set(updates)
  },
}))
