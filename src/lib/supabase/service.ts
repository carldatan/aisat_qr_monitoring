import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

	if (!serviceRoleKey || serviceRoleKey === 'your-service-role-key-here') {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing or still set to the placeholder value.')
	}

	if (serviceRoleKey.startsWith('sb_publishable_')) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY must be the Supabase service role key, not the anon/publishable key.')
	}

	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		serviceRoleKey,
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		}
	)
}
