import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL ?? ''
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? ''
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? ''

export const createSupabaseAdminClient = () =>
  createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

export const createSupabaseBrowserlessClient = () =>
  createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
