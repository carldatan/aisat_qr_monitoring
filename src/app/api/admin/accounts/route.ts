import { NextResponse } from 'next/server'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const VALID_ROLES = ['admin', 'user', 'super_admin'] as const

export async function POST(request: Request) {
	try {
		const supabase = await createServerSupabaseClient()
		const {
			data: { user },
		} = await supabase.auth.getUser()

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single()

		if (profileError || profile?.role !== 'super_admin') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}

		const body = await request.json().catch(() => null)
		const username = String(body?.username ?? '').trim()
		const full_name = String(body?.full_name ?? '').trim()
		const id_number = String(body?.id_number ?? '').trim()
		const password = String(body?.password ?? '')
		const role = String(body?.role ?? 'admin') as (typeof VALID_ROLES)[number]

		if (!username || !full_name || !id_number || !password) {
			return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
		}

		if (!VALID_ROLES.includes(role)) {
			return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
		}

		let service
		try {
			service = createServiceClient()
		} catch (error) {
			return NextResponse.json(
				{ error: error instanceof Error ? error.message : 'Service role key is not configured.' },
				{ status: 500 }
			)
		}
		const { data: existingProfile, error: usernameError } = await service
			.from('profiles')
			.select('id')
			.eq('username', username)
			.maybeSingle()

		if (usernameError) {
			return NextResponse.json(
				{ error: usernameError.message ?? 'Could not validate username.' },
				{ status: 400 }
			)
		}

		if (existingProfile) {
			return NextResponse.json({ error: 'Username already exists.' }, { status: 400 })
		}

		const email = `${username}@aisat.internal`

		const { data: createdUser, error: createError } = await service.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: {
				username,
				full_name,
				id_number,
			},
		})

		if (createError || !createdUser.user) {
			const message = createError?.message ?? 'Could not create auth user.'
			if (/invalid api key/i.test(message)) {
				return NextResponse.json(
					{
						error:
							'Supabase rejected the service role key. Make sure SUPABASE_SERVICE_ROLE_KEY is the current service role key for this project, not the anon/publishable key or a revoked key.',
					},
					{ status: 401 }
				)
			}

			return NextResponse.json(
				{ error: message },
				{ status: 400 }
			)
		}

		const { error: updateError } = await service
			.from('profiles')
			.update({
				username,
				full_name,
				id_number,
				email,
				role,
				updated_at: new Date().toISOString(),
			})
			.eq('id', createdUser.user.id)

		if (updateError) {
			await service.auth.admin.deleteUser(createdUser.user.id)
			return NextResponse.json(
				{ error: updateError.message ?? 'Could not update profile.' },
				{ status: 400 }
			)
		}

		return NextResponse.json({
			id: createdUser.user.id,
			username,
			full_name,
			id_number,
			role,
		})
	} catch (error) {
		console.error('create account:', error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Server error' },
			{ status: 500 }
		)
	}
}
