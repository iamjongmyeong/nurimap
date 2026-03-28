import type { Plugin } from 'vite'

const DEFAULT_SUPABASE_STUDIO_HOST = '127.0.0.1'
const DEFAULT_SUPABASE_STUDIO_PORT = '54323'

type DevBannerEnv = Record<string, string | undefined>

export const shouldPrintSupabaseStudioBanner = (env: DevBannerEnv) =>
  env.NURIMAP_SHOW_SUPABASE_STUDIO_BANNER === 'true' || env.VITE_ENABLE_AGENTATION === 'true'

export const resolveSupabaseStudioUrl = (env: DevBannerEnv) => {
  const explicitUrl = env.SUPABASE_STUDIO_URL?.trim()
  if (explicitUrl) {
    return explicitUrl
  }

  const host = env.SUPABASE_STUDIO_HOST?.trim() || DEFAULT_SUPABASE_STUDIO_HOST
  const port = env.SUPABASE_STUDIO_PORT?.trim() || DEFAULT_SUPABASE_STUDIO_PORT

  return `http://${host}:${port}`
}

export const createSupabaseStudioBannerPlugin = (env: DevBannerEnv = process.env): Plugin => ({
  name: 'nurimap-supabase-studio-startup-banner',
  configureServer(server) {
    const originalPrintUrls = server.printUrls.bind(server)

    server.printUrls = () => {
      originalPrintUrls()

      if (!shouldPrintSupabaseStudioBanner(env)) {
        return
      }

      server.config.logger.info(`  ➜  Supabase Studio: ${resolveSupabaseStudioUrl(env)}`, {
        clear: false,
        timestamp: false,
      })
    }
  },
})
