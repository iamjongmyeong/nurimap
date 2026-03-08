import { createClient } from '@supabase/supabase-js'

export const createSupabaseAdminClient = () =>
  createClient(process.env.PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

export const createSupabaseBrowserlessClient = () =>
  createClient(process.env.PUBLIC_SUPABASE_URL ?? '', process.env.PUBLIC_SUPABASE_ANON_KEY ?? '', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
