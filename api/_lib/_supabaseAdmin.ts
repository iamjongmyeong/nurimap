import { createClient } from '@supabase/supabase-js'

const getEnvString = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const resolveSupabaseUrl = (env: NodeJS.ProcessEnv = process.env) =>
  getEnvString(env.SUPABASE_URL)
  ?? getEnvString(env.NEXT_PUBLIC_SUPABASE_URL)
  ?? getEnvString(env.PUBLIC_SUPABASE_URL)

const resolveSupabaseSecretKey = (env: NodeJS.ProcessEnv = process.env) =>
  getEnvString(env.SUPABASE_SECRET_KEY)
  ?? getEnvString(env.SUPABASE_SERVICE_ROLE_KEY)

const resolveSupabasePublishableKey = (env: NodeJS.ProcessEnv = process.env) =>
  getEnvString(env.SUPABASE_PUBLISHABLE_KEY)
  ?? getEnvString(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  ?? getEnvString(env.SUPABASE_ANON_KEY)
  ?? getEnvString(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ?? getEnvString(env.PUBLIC_SUPABASE_ANON_KEY)

const requireSupabaseUrl = (env: NodeJS.ProcessEnv = process.env) => {
  const resolved = resolveSupabaseUrl(env)
  if (resolved) {
    return resolved
  }

  throw new Error(
    'Supabase URL is missing. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_URL.',
  )
}

const requireSupabaseSecretKey = (env: NodeJS.ProcessEnv = process.env) => {
  const resolved = resolveSupabaseSecretKey(env)
  if (resolved) {
    return resolved
  }

  throw new Error(
    'Supabase admin key is missing. Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY.',
  )
}

const requireSupabasePublishableKey = (env: NodeJS.ProcessEnv = process.env) => {
  const resolved = resolveSupabasePublishableKey(env)
  if (resolved) {
    return resolved
  }

  throw new Error(
    'Supabase publishable key is missing. Set SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY.',
  )
}

export const createSupabaseAdminClient = () =>
  createClient(requireSupabaseUrl(), requireSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

export const createSupabaseAuthClient = () =>
  createClient(requireSupabaseUrl(), requireSupabasePublishableKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
