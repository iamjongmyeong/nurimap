import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(() => ({ auth: {} })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

import { createSupabaseAdminClient, createSupabaseAuthClient } from './supabaseAdmin'

const originalEnv = { ...process.env }

describe('supabaseAdmin config', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    createClientMock.mockReset()
    createClientMock.mockReturnValue({ auth: {} })
  })

  it('uses canonical Supabase env names when present', () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co'
    process.env.SUPABASE_SECRET_KEY = 'secret-key'
    process.env.SUPABASE_PUBLISHABLE_KEY = 'publishable-key'

    createSupabaseAdminClient()
    createSupabaseAuthClient()

    expect(createClientMock).toHaveBeenNthCalledWith(1, 'https://project.supabase.co', 'secret-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    expect(createClientMock).toHaveBeenNthCalledWith(2, 'https://project.supabase.co', 'publishable-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  })

  it('falls back to legacy alias env names when canonical names are missing', () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SECRET_KEY
    delete process.env.SUPABASE_PUBLISHABLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    delete process.env.SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://legacy.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-secret'
    process.env.PUBLIC_SUPABASE_ANON_KEY = 'legacy-anon'

    createSupabaseAdminClient()
    createSupabaseAuthClient()

    expect(createClientMock).toHaveBeenNthCalledWith(1, 'https://legacy.supabase.co', 'legacy-secret', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    expect(createClientMock).toHaveBeenNthCalledWith(2, 'https://legacy.supabase.co', 'legacy-anon', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  })

  it('fails fast with a clear error when the Supabase URL is missing', () => {
    delete process.env.SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.PUBLIC_SUPABASE_URL
    process.env.SUPABASE_SECRET_KEY = 'secret-key'

    expect(() => createSupabaseAdminClient()).toThrow(
      'Supabase URL is missing. Set SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_URL.',
    )
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('fails fast with a clear error when the admin key is missing', () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co'
    delete process.env.SUPABASE_SECRET_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    expect(() => createSupabaseAdminClient()).toThrow(
      'Supabase admin key is missing. Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY.',
    )
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('fails fast with a clear error when the publishable key is missing', () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co'
    delete process.env.SUPABASE_PUBLISHABLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    delete process.env.SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.PUBLIC_SUPABASE_ANON_KEY

    expect(() => createSupabaseAuthClient()).toThrow(
      'Supabase publishable key is missing. Set SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY.',
    )
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
