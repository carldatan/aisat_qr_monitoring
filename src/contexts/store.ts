'use client'

import { create } from 'zustand'
import type { Profile, Equipment, HistoryLog, ScannedLibrary } from '@/types'
import {
  getAllEquipment, getAllProfiles, getHistoryLogs,
  getHistoryLogsByUser, getScannedLibrary,
} from '@/lib/db'
import { isPrivilegedRole } from '@/lib/roles'

type FetchKey = 'equipment' | 'profiles' | 'historyLogs' | 'scannedLibrary'

type FetchState = Record<FetchKey, number>

export type PageName = 'dashboard' | 'admin' | 'adminLogs' | 'borrow' | 'library'

const CACHE_TTL = 60_000

const EMPTY_FETCH: FetchState = {
  equipment: 0,
  profiles: 0,
  historyLogs: 0,
  scannedLibrary: 0,
}

interface AppState {
  profile: Profile | null
  setProfile: (p: Profile | null) => void

  equipment: Equipment[]
  profiles: Profile[]
  historyLogs: HistoryLog[]
  scannedLibrary: ScannedLibrary[]

  fetchState: FetchState

  refreshEquipment: () => Promise<void>
  refreshProfiles: () => Promise<void>
  refreshHistory: (username?: string) => Promise<void>
  refreshLibrary: () => Promise<void>
  refreshAll: () => Promise<void>
  loadPageData: (page: PageName) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  setProfile: (p) => set({ profile: p }),

  equipment: [],
  profiles: [],
  historyLogs: [],
  scannedLibrary: [],
  fetchState: { ...EMPTY_FETCH },

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
    const { profile } = get()
    const isPrivileged = isPrivilegedRole(profile?.role)

    const [equipment, historyLogs] = await Promise.all([
      getAllEquipment(),
      isPrivileged ? getHistoryLogs() : getHistoryLogsByUser(profile?.username ?? ''),
    ])

    const updates: Partial<AppState> = { equipment, historyLogs }

    if (isPrivileged) {
      const [profiles, scannedLibrary] = await Promise.all([
        getAllProfiles(),
        getScannedLibrary(),
      ])
      updates.profiles = profiles
      updates.scannedLibrary = scannedLibrary
    }

    const now = Date.now()
    set({
      ...updates,
      fetchState: { equipment: now, profiles: now, historyLogs: now, scannedLibrary: now },
    })
  },

  loadPageData: async (page) => {
    const { profile, fetchState } = get()
    const now = Date.now()
    const privileged = isPrivilegedRole(profile?.role)

    const stale = (k: FetchKey) => now - fetchState[k] > CACHE_TTL

    const staleEquipment = (page === 'dashboard' || page === 'admin') && stale('equipment')
    const staleHistory   = (page === 'dashboard' || page === 'adminLogs') && stale('historyLogs')
    const staleProfiles  = page === 'admin' && stale('profiles')
    const staleLibrary   = page === 'library' && stale('scannedLibrary')

    const batch: Promise<void>[] = []

    if (staleEquipment) batch.push(
      getAllEquipment().then(d => set({ equipment: d }))
    )
    if (staleHistory) batch.push(
      (privileged ? getHistoryLogs() : getHistoryLogsByUser(profile?.username ?? ''))
        .then(d => set({ historyLogs: d }))
    )
    if (staleProfiles) batch.push(
      getAllProfiles().then(d => set({ profiles: d }))
    )
    if (staleLibrary) batch.push(
      getScannedLibrary().then(d => set({ scannedLibrary: d }))
    )

    if (batch.length === 0) return

    await Promise.all(batch)
    const next = { ...get().fetchState }
    const k = Date.now()
    if (staleEquipment) next.equipment = k
    if (staleHistory) next.historyLogs = k
    if (staleProfiles) next.profiles = k
    if (staleLibrary) next.scannedLibrary = k
    set({ fetchState: next })
  },
}))
