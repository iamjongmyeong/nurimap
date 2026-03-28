import { createSupabaseStudioBannerPlugin, resolveSupabaseStudioUrl, shouldPrintSupabaseStudioBanner } from './vite.agentationBanner'

describe('supabase studio startup banner', () => {
  it('enables the extra banner for agentation or explicitly flagged dev mode', () => {
    expect(shouldPrintSupabaseStudioBanner({ VITE_ENABLE_AGENTATION: 'true' })).toBe(true)
    expect(shouldPrintSupabaseStudioBanner({ NURIMAP_SHOW_SUPABASE_STUDIO_BANNER: 'true' })).toBe(true)
    expect(shouldPrintSupabaseStudioBanner({ VITE_ENABLE_AGENTATION: 'false' })).toBe(false)
    expect(shouldPrintSupabaseStudioBanner({})).toBe(false)
  })

  it('prefers an explicit Supabase Studio URL when provided', () => {
    expect(resolveSupabaseStudioUrl({
      SUPABASE_STUDIO_URL: 'https://studio.example.com',
      SUPABASE_STUDIO_HOST: 'ignored.example.com',
      SUPABASE_STUDIO_PORT: '9999',
    })).toBe('https://studio.example.com')
  })

  it('falls back to the standard local Supabase Studio URL', () => {
    expect(resolveSupabaseStudioUrl({})).toBe('http://127.0.0.1:54323')
    expect(resolveSupabaseStudioUrl({
      SUPABASE_STUDIO_HOST: '192.168.0.10',
      SUPABASE_STUDIO_PORT: '65432',
    })).toBe('http://192.168.0.10:65432')
  })

  it('prints the Supabase Studio link after Vite prints its URLs', () => {
    const printed: string[] = []
    const logger = {
      info: vi.fn((message: string) => {
        printed.push(message)
      }),
    }
    const server = {
      printUrls: vi.fn(() => {
        printed.push('vite urls')
      }),
      config: { logger },
    }

    const plugin = createSupabaseStudioBannerPlugin({
      NURIMAP_SHOW_SUPABASE_STUDIO_BANNER: 'true',
      SUPABASE_STUDIO_URL: 'http://127.0.0.1:54323',
    })

    plugin.configureServer?.(server as never)
    server.printUrls()

    expect(printed).toEqual([
      'vite urls',
      '  ➜  Supabase Studio: http://127.0.0.1:54323',
    ])
  })

  it('keeps the default Vite banner unchanged when Agentation is off', () => {
    const printed: string[] = []
    const logger = {
      info: vi.fn((message: string) => {
        printed.push(message)
      }),
    }
    const server = {
      printUrls: vi.fn(() => {
        printed.push('vite urls')
      }),
      config: { logger },
    }

    const plugin = createSupabaseStudioBannerPlugin({
      VITE_ENABLE_AGENTATION: 'false',
      SUPABASE_STUDIO_URL: 'http://127.0.0.1:54323',
    })

    plugin.configureServer?.(server as never)
    server.printUrls()

    expect(printed).toEqual(['vite urls'])
  })
})
