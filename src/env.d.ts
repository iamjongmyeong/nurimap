declare global {
  interface ImportMetaEnv {
    readonly PUBLIC_SENTRY_DSN?: string
  }

  // Vite build-time injected globals for browser-side Sentry metadata.
  var __NURIMAP_SENTRY_RELEASE__: string | null | undefined
  var __NURIMAP_SENTRY_ENVIRONMENT__: string | null | undefined
}

export {}
