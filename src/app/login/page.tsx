'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { loginWithUsername, signupUser } from '@/lib/auth'

type AuthMode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Login state
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')

  // Signup state
  const [regName, setRegName] = useState('')
  const [regId, setRegId] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPass, setRegPass] = useState('')

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

  const handleSignup = async () => {
    setError('')
    if (!regName || !regId || !regUsername || !regPass) {
      setError('All fields are required.')
      return
    }
    setLoading(true)
    try {
      await signupUser({
        username: regUsername,
        full_name: regName,
        id_number: regId,
        password: regPass,
      })
      alert('Registration successful!')
      setMode('login')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-gradient-to-br from-white to-gray-200">
      <div className="w-[420px] p-10 border border-border bg-white rounded-xl shadow-login text-center">
        {mode === 'login' ? (
          <div>
            <h2 className="text-[28px] font-mono font-bold text-primary mb-1">
              AISAT COLLEGE DASMA
            </h2>
            <p className="text-xs text-muted mb-6">
              QR Code Based Tools Monitoring System
            </p>

            {error && (
              <p className="text-danger text-sm font-mono mb-3 p-2 bg-red-50 rounded border border-red-200">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              <Input
                label="Username"
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
                {loading ? 'LOGGING IN...' : 'LOG IN'}
              </Button>
            </div>

            <div className="mt-4 text-xs font-mono flex justify-center gap-4">
              <button
                onClick={() => alert('Contact Admin.')}
                className="text-danger hover:underline"
              >
                Forgot?
              </button>
              <button
                onClick={() => { setMode('signup'); setError('') }}
                className="text-primary hover:underline"
              >
                Create Account
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-mono font-bold mb-5">CREATE ACCOUNT</h2>

            {error && (
              <p className="text-danger text-sm font-mono mb-3 p-2 bg-red-50 rounded border border-red-200">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              <Input label="Full Name*" value={regName} onChange={e => setRegName(e.target.value)} />
              <Input label="ID Number*" value={regId} onChange={e => setRegId(e.target.value)} />
              <Input label="Username*" value={regUsername} onChange={e => setRegUsername(e.target.value)} />
              <PasswordInput label="Password*" value={regPass} onChange={e => setRegPass(e.target.value)} />
              <Button fullWidth onClick={handleSignup} disabled={loading}>
                {loading ? 'REGISTERING...' : 'REGISTER'}
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => { setMode('login'); setError('') }}
              >
                BACK
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
