import { execSync } from 'node:child_process'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import react from '@vitejs/plugin-react'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { loadEnv, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from 'vitest/config'
import { createSupabaseStudioBannerPlugin } from './vite.agentationBanner'

type DevApiRouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void
type DevApiQuery = Record<string, string | string[]>
type DevApiRouteModule = { default: DevApiRouteHandler }
type DevApiRequestOverrides = { body?: unknown; query?: DevApiQuery }
type ResolvedDevApiRoute = {
  handlerPath: string
  requestOverrides?: DevApiRequestOverrides
}

const readRequestBody = async (req: IncomingMessage) => {
  return await new Promise<string>((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

const parseRequestQuery = (url: string | undefined): DevApiQuery => {
  const requestUrl = new URL(url ?? '/', 'http://localhost')
  const query: DevApiQuery = {}

  for (const [key, value] of requestUrl.searchParams) {
    const existing = query[key]
    if (existing === undefined) {
      query[key] = value
      continue
    }

    if (Array.isArray(existing)) {
      existing.push(value)
      continue
    }

    query[key] = [existing, value]
  }

  return query
}

const parseRequestBody = (req: IncomingMessage, rawBody: string) => {
  if (!rawBody) {
    return undefined
  }

  const contentType = req.headers['content-type']
  const normalizedContentType = Array.isArray(contentType)
    ? contentType[0]
    : contentType

  try {
    if (normalizedContentType?.toLowerCase().includes('application/json')) {
      return JSON.parse(rawBody) as unknown
    }

    return rawBody
  } catch {
    return undefined
  }
}

const DEV_API_ROUTE_LOADERS = new Map<string, () => Promise<DevApiRouteModule>>([
  ['/api/auth/profile', () => import('./api/auth/profile')],
  ['/api/auth/request-otp', () => import('./api/auth/request-otp')],
  ['/api/auth/session', () => import('./api/auth/session')],
  ['/api/auth/verify-otp', () => import('./api/auth/verify-otp')],
  ['/api/place-lookups', () => import('./api/place-lookups/index')],
  ['/api/place-submissions', () => import('./api/place-submissions/index')],
  ['/api/place-submissions/[submissionId]/confirmations', () => import('./api/place-submissions/[submissionId]/confirmations')],
  ['/api/places', () => import('./api/places/index')],
  ['/api/places/[placeId]', () => import('./api/places/[placeId]')],
  ['/api/places/[placeId]/reviews', () => import('./api/places/[placeId]/reviews/index')],
])

const devApiRouteHandlerCache = new Map<string, Promise<DevApiRouteHandler>>()

const loadDevApiRouteHandler = (path: string) => {
  const existing = devApiRouteHandlerCache.get(path)
  if (existing) {
    return existing
  }

  const loader = DEV_API_ROUTE_LOADERS.get(path)
  if (!loader) {
    throw new Error(`Unknown dev API route: ${path}`)
  }

  const loadedHandler = loader().then((module) => module.default)
  devApiRouteHandlerCache.set(path, loadedHandler)
  return loadedHandler
}

const resolveDevApiRoute = async (req: IncomingMessage): Promise<ResolvedDevApiRoute | null> => {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const pathname = requestUrl.pathname
  const method = (req.method ?? 'GET').toUpperCase()

  if (method === 'DELETE' && pathname === '/api/auth/session') {
    return { handlerPath: '/api/auth/session' }
  }

  if (method === 'PATCH' && pathname === '/api/auth/profile') {
    return { handlerPath: '/api/auth/profile' }
  }

  if (method === 'GET' && pathname === '/api/places') {
    return { handlerPath: '/api/places' }
  }

  const placeDetailMatch = pathname.match(/^\/api\/places\/([^/]+)$/)
  if (method === 'GET' && placeDetailMatch) {
    return {
      handlerPath: '/api/places/[placeId]',
      requestOverrides: {
        query: {
          placeId: decodeURIComponent(placeDetailMatch[1]),
        },
      },
    }
  }

  if (method === 'POST' && pathname === '/api/place-lookups') {
    return { handlerPath: '/api/place-lookups' }
  }

  if (method === 'POST' && pathname === '/api/place-submissions') {
    return { handlerPath: '/api/place-submissions' }
  }

  const confirmationMatch = pathname.match(/^\/api\/place-submissions\/([^/]+)\/confirmations$/)
  if (method === 'POST' && confirmationMatch) {
    return {
      handlerPath: '/api/place-submissions/[submissionId]/confirmations',
      requestOverrides: {
        query: {
          submissionId: decodeURIComponent(confirmationMatch[1]),
        },
      },
    }
  }

  const placeReviewMatch = pathname.match(/^\/api\/places\/([^/]+)\/reviews$/)
  if (method === 'POST' && placeReviewMatch) {
    return {
      handlerPath: '/api/places/[placeId]/reviews',
      requestOverrides: {
        query: {
          placeId: decodeURIComponent(placeReviewMatch[1]),
        },
      },
    }
  }

  if (DEV_API_ROUTE_LOADERS.has(pathname)) {
    return { handlerPath: pathname }
  }

  return null
}

const runDevApiRoute = async ({
  handler,
  req,
  res,
  requestOverrides,
}: {
  handler: DevApiRouteHandler
  req: IncomingMessage
  res: ServerResponse<IncomingMessage>
  requestOverrides?: DevApiRequestOverrides
}) => {
  const vercelRequest = req as VercelRequest & {
    body?: unknown
    query?: DevApiQuery
  }
  const vercelResponse = res as VercelResponse & {
    status?: (statusCode: number) => VercelResponse
    json?: (body: unknown) => VercelResponse
  }

  if (!vercelResponse.status) {
    vercelResponse.status = (statusCode: number) => {
      res.statusCode = statusCode
      return vercelResponse
    }
  }

  if (!vercelResponse.json) {
    vercelResponse.json = (body: unknown) => {
      if (!res.hasHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json')
      }

      res.end(JSON.stringify(body))
      return vercelResponse
    }
  }

  vercelRequest.query = {
    ...parseRequestQuery(req.url),
    ...(requestOverrides?.query ?? {}),
  }
  if (requestOverrides?.body !== undefined) {
    vercelRequest.body = requestOverrides.body
  }

  if (vercelRequest.body === undefined && vercelRequest.method !== 'GET' && vercelRequest.method !== 'HEAD') {
    const rawBody = await readRequestBody(req)
    vercelRequest.body = parseRequestBody(req, rawBody)
  }

  await handler(vercelRequest, vercelResponse)
}

const apiDevPlugin = (): Plugin => ({
  name: 'nurimap-api-dev-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
      if (!pathname.startsWith('/api/')) {
        next()
        return
      }

      const resolvedRoute = await resolveDevApiRoute(req)
      if (!resolvedRoute) {
        next()
        return
      }

      try {
        const handler = await loadDevApiRouteHandler(resolvedRoute.handlerPath)
        await runDevApiRoute({
          handler,
          req,
          res,
          requestOverrides: resolvedRoute.requestOverrides,
        })
      } catch (error) {
        next(error as Error)
      }
    })
  },
})

const getGitSha = () => {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return undefined
  }
}

const resolveSentryRelease = (env: Record<string, string>) => {
  if (env.SENTRY_RELEASE?.trim()) {
    return env.SENTRY_RELEASE.trim()
  }

  const releaseSource = env.SENTRY_RELEASE_SOURCE?.trim()
  if (releaseSource && env[releaseSource]?.trim()) {
    return env[releaseSource].trim()
  }

  return getGitSha()
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sentryEnvironment = env.SENTRY_ENVIRONMENT?.trim() || 'production'
  const sentryRelease = resolveSentryRelease(env)
  const shouldEnableSentryPlugin = command === 'build'
    && Boolean(env.SENTRY_AUTH_TOKEN?.trim())
    && Boolean(env.SENTRY_ORG?.trim())
    && Boolean(env.SENTRY_PROJECT?.trim())

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'PUBLIC_'],
    define: {
      'globalThis.__NURIMAP_SENTRY_RELEASE__': JSON.stringify(sentryRelease ?? null),
      'globalThis.__NURIMAP_SENTRY_ENVIRONMENT__': JSON.stringify(sentryEnvironment),
    },
    build: {
      sourcemap: command === 'build',
    },
    plugins: [
      react(),
      tailwindcss(),
      apiDevPlugin(),
      createSupabaseStudioBannerPlugin(),
      ...(shouldEnableSentryPlugin
        ? [sentryVitePlugin({
          org: env.SENTRY_ORG.trim(),
          project: env.SENTRY_PROJECT.trim(),
          authToken: env.SENTRY_AUTH_TOKEN.trim(),
          telemetry: false,
          release: sentryRelease
            ? {
              name: sentryRelease,
              inject: true,
              create: true,
              finalize: true,
            }
            : undefined,
          sourcemaps: {
            filesToDeleteAfterUpload: ['dist/**/*.js.map', 'dist/**/*.mjs.map', 'dist/**/*.css.map'],
          },
          bundleSizeOptimizations: {
            excludeTracing: true,
          },
        })]
        : []),
    ],
    server: {
      host: '0.0.0.0',
      strictPort: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
    },
  }
})
