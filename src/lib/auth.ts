import { createClient } from '@/lib/supabase/client'
import type { LoginCredentials, SignupCredentials } from '@/types'

/**
 * Login using Supabase Auth.
 * We store username in the profile table; email is username@aisat.local (internal convention).
 */
export async function loginWithUsername({ username, password }: LoginCredentials) {
  const supabase = createClient()
  const internalEmail = `${username}@aisat.internal`

  const { data, error } = await supabase.auth.signInWithPassword({
    email: internalEmail,
    password,
  })

  if (error) throw new Error(error.message)
  return data
}

export async function signupUser(creds: SignupCredentials) {
  const supabase = createClient()

const internalEmail = `${creds.username}@aisat.internal`
  // Check username uniqueness first
const { data: exists, error: checkErr } = await supabase
  .rpc('username_exists', { p_username: creds.username })

if (checkErr) throw new Error('Could not verify username availability')
if (exists) throw new Error('Username already exists')

  // Create auth user
  const { data, error } = await supabase.auth.signUp({
    email: internalEmail,
    password: creds.password,
    options: {
      data: {
        username: creds.username,
        full_name: creds.full_name,
        id_number: creds.id_number,
      },
    },
  })

  if (error) throw new Error(error.message)
  return data
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
