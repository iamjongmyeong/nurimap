import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL
  ?? import.meta.env.PUBLIC_SUPABASE_URL
  ?? (import.meta.env.MODE === 'test' ? 'https://example.supabase.co' : undefined)
const supabasePublishableKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  ?? (import.meta.env.MODE === 'test' ? 'test-anon-key' : undefined)

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase browser environment is missing.')
}

export const supabaseBrowser = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)
