'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, UserCog, UserPlus } from 'lucide-react'
import { useAppStore } from '@/contexts/store'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { deleteProfile, updateProfileRole } from '@/lib/db'
import { createAdminAccount } from '@/lib/auth'
import { formatDateTime } from '@/lib/utils'
import { isPrivilegedRole, isSuperAdminRole } from '@/lib/roles'
import type { Profile } from '@/types'

export default function ConsolePage() {
  const router = useRouter()
  const profile = useAppStore(s => s.profile)
  const profiles = useAppStore(s => s.profiles)
  const loadPageData = useAppStore(s => s.loadPageData)
  const refreshAll = useAppStore(s => s.refreshAll)

  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [selectedProfileRole, setSelectedProfileRole] = useState<'super_admin' | 'admin' | 'user'>('admin')
  const [profileActionLoading, setProfileActionLoading] = useState(false)

  const [createUsername, setCreateUsername] = useState('')
  const [createFullName, setCreateFullName] = useState('')
  const [createIdNumber, setCreateIdNumber] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<'admin' | 'user' | 'super_admin'>('admin')
  const [createLoading, setCreateLoading] = useState(false)

  useEffect(() => {
    loadPageData('admin')
  }, [loadPageData])

  useEffect(() => {
    if (profile && !isPrivilegedRole(profile.role)) {
      router.replace('/dashboard')
    }
  }, [profile, router])

  const canManageProfiles = isSuperAdminRole(profile?.role)
  const selectedProfile = profiles.find(item => item.id === selectedProfileId) ?? null
  const adminProfiles = profiles.filter(item => item.role === 'admin' || item.role === 'super_admin')
  const superAdminCount = profiles.filter(item => item.role === 'super_admin').length

  const handleCreateAccount = async () => {
    if (!profile || !canManageProfiles) return
    const normalizedUsername = createUsername.trim()
    const normalizedFullName = createFullName.trim()
    const normalizedIdNumber = createIdNumber.trim()
    if (!normalizedUsername || !normalizedFullName || !normalizedIdNumber || !createPassword) {
      alert('Fill in the account fields.')
      return
    }
    setCreateLoading(true)
    try {
      await createAdminAccount({
        username: normalizedUsername,
        full_name: normalizedFullName,
        id_number: normalizedIdNumber,
        password: createPassword,
        role: createRole,
      })
      setCreateUsername('')
      setCreateFullName('')
      setCreateIdNumber('')
      setCreatePassword('')
      setCreateRole('admin')
      await refreshAll()
      alert(`Created @${normalizedUsername} as ${createRole.replace('_', ' ')}.`)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Error creating account.')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleSaveProfileRole = async () => {
    if (!profile || !canManageProfiles) return
    if (!selectedProfileId) { alert('Select a profile to manage.'); return }
    if (selectedProfileId === profile.id) { alert('You cannot change your own account from this screen.'); return }
    const target = profiles.find(item => item.id === selectedProfileId)
    if (!target) { alert('Selected profile was not found.'); return }
    if (target.role === 'super_admin' && selectedProfileRole !== 'super_admin' && superAdminCount <= 1) {
      alert('At least one super admin must remain.')
      return
    }
    setProfileActionLoading(true)
    try {
      await updateProfileRole(selectedProfileId, selectedProfileRole)
      await refreshAll()
      alert(`Updated ${target.username} to ${selectedProfileRole.replace('_', ' ')}.`)
    } catch (error) {
      console.error(error)
      alert('Error updating profile role.')
    } finally {
      setProfileActionLoading(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (!profile || !canManageProfiles) return
    if (!selectedProfileId) { alert('Select a profile to delete.'); return }
    if (selectedProfileId === profile.id) { alert('You cannot delete your own account from this screen.'); return }
    const target = profiles.find(item => item.id === selectedProfileId)
    if (!target) { alert('Selected profile was not found.'); return }
    if (target.role === 'super_admin' && superAdminCount <= 1) {
      alert('At least one super admin must remain.')
      return
    }
    if (!confirm(`Delete ${target.full_name} (@${target.username})? This only removes the profile row.`)) return
    setProfileActionLoading(true)
    try {
      await deleteProfile(selectedProfileId)
      await refreshAll()
      setSelectedProfileId('')
      alert(`Deleted ${target.username}.`)
    } catch (error) {
      console.error(error)
      alert('Error deleting profile.')
    } finally {
      setProfileActionLoading(false)
    }
  }

  if (!canManageProfiles) {
    return (
      <Panel>
        <p className="text-base font-mono text-muted">You do not have permission to access this page.</p>
      </Panel>
    )
  }

  return (
    <Panel>
      <h3 className="mb-2 flex items-center gap-2 font-bold font-mono text-lg">
        <ShieldCheck className="h-5 w-5 text-primary" />
        Super Admin Console
      </h3>
      <p className="text-base font-mono text-muted mb-5">
        Create new accounts and manage admin roles from one place.
      </p>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <h4 className="mb-4 flex items-center gap-2 font-bold font-mono text-base">
            <UserPlus className="h-5 w-5 text-primary" />
            Create Account
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Username" value={createUsername} onChange={event => setCreateUsername(event.target.value)} />
            <Input label="Full Name" value={createFullName} onChange={event => setCreateFullName(event.target.value)} />
            <Input label="ID Number" value={createIdNumber} onChange={event => setCreateIdNumber(event.target.value)} />
            <Input label="Temporary Password" type="password" value={createPassword} onChange={event => setCreatePassword(event.target.value)} />
            <select
              value={createRole}
              onChange={event => setCreateRole(event.target.value as 'admin' | 'super_admin')}
              className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-base font-mono md:col-span-2"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <Button className="mt-4" fullWidth onClick={handleCreateAccount} disabled={createLoading}>
            {createLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <h4 className="mb-4 flex items-center gap-2 font-bold font-mono text-base">
            <UserCog className="h-5 w-5 text-primary" />
            Manage Admin Accounts
          </h4>
          <div className="grid gap-3">
            <select
              value={selectedProfileId}
              onChange={event => {
                const nextId = event.target.value
                setSelectedProfileId(nextId)
                const nextProfile = profiles.find(item => item.id === nextId)
                setSelectedProfileRole(nextProfile?.role ?? 'admin')
              }}
              className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-base font-mono"
            >
              <option value="">Select profile</option>
              {profiles
                .filter(item => item.id !== profile?.id)
                .sort((a, b) => a.username.localeCompare(b.username))
                .map(item => (
                  <option key={item.id} value={item.id}>
                    {item.full_name} (@{item.username}) - {item.role}
                  </option>
                ))}
            </select>
            <select
              value={selectedProfileRole}
              onChange={event => setSelectedProfileRole(event.target.value as 'super_admin' | 'admin' | 'user')}
              className="w-full rounded border border-border bg-white px-3.5 py-3.5 text-base font-mono"
            >
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <div className="flex gap-2">
              <Button fullWidth onClick={handleSaveProfileRole} disabled={profileActionLoading || !selectedProfileId}>
                {profileActionLoading ? 'SAVING...' : 'SAVE ROLE'}
              </Button>
              <Button variant="danger" fullWidth onClick={handleDeleteProfile} disabled={profileActionLoading || !selectedProfileId}>
                DELETE
              </Button>
            </div>
            {selectedProfile && (
              <p className="text-sm font-mono text-muted">
                Selected: {selectedProfile.full_name} (@{selectedProfile.username}) | Current role: {selectedProfile.role}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <DataTable
          columns={[
            { header: 'Name', accessor: (row: Profile) => row.full_name },
            { header: 'Username', accessor: (row: Profile) => `@${row.username}` },
            { header: 'ID Number', accessor: 'id_number' as keyof Profile },
            { header: 'Role', accessor: 'role' as keyof Profile },
            { header: 'Created', accessor: (row: Profile) => formatDateTime(row.created_at) },
          ]}
          data={adminProfiles}
          emptyMessage="No admin accounts found."
        />
      </div>
    </Panel>
  )
}
