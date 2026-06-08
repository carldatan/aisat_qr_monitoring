'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { loginWithUsername } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')

  const handleLogin = async () => {
    setError('')
    if (!loginUser || !loginPass) { setError('Enter username and password.'); return }
    setLoading(true)
    try {
      await loginWithUsername({ username: loginUser, password: loginPass })
      router.push('/dashboard')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-gradient-to-br from-white to-gray-200">
      <div className="w-[420px] p-10 border border-border bg-white rounded-xl shadow-login text-center">
        <div>
          <h2 className="text-[28px] font-mono font-bold text-primary mb-1">
            AISAT COLLEGE DASMA
          </h2>
          <p className="text-xs text-muted mb-6">
            Admin Tools Monitoring System
          </p>

          {error && (
            <p className="text-danger text-sm font-mono mb-3 p-2 bg-red-50 rounded border border-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2.5">
            <Input
              label="Admin Username"
              value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <PasswordInput
              label="Password"
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <Button fullWidth onClick={handleLogin} disabled={loading}>
              {loading ? 'LOGGING IN...' : 'ADMIN LOG IN'}
            </Button>
          </div>

          <div className="mt-4 text-xs font-mono flex justify-center gap-4">
            <button
              onClick={() => alert('Contact the system administrator.')}
              className="text-danger hover:underline"
            >
              Forgot?
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
