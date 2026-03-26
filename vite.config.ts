import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from 'vitest/config'

type DevApiRouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void
type DevApiQuery = Record<string, string | string[]>
type DevApiRouteModule = { default: DevApiRouteHandler }
type DevApiRequestOverrides = {
  body?: unknown
  method?: string
  query?: DevApiQuery
}
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

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  return Buffer.from(`${normalized}${'='.repeat(padding)}`, 'base64').toString('utf8')
}

const decodePlaceSubmissionId = (submissionId: string) => {
  try {
    return asRecord(JSON.parse(decodeBase64Url(decodeURIComponent(submissionId))))
  } catch {
    return null
  }
}

const DEV_API_ROUTE_LOADERS = new Map<string, () => Promise<DevApiRouteModule>>([
  ['/api/auth/logout', () => import('./api/auth/logout')],
  ['/api/auth/profile', () => import('./api/auth/profile')],
  ['/api/auth/request-link', () => import('./api/auth/request-link')],
  ['/api/auth/request-otp', () => import('./api/auth/request-otp')],
  ['/api/auth/session', () => import('./api/auth/session')],
  ['/api/auth/verify-otp', () => import('./api/auth/verify-otp')],
  ['/api/place-detail', () => import('./api/place-detail')],
  ['/api/place-entry', () => import('./api/place-entry')],
  ['/api/place-list', () => import('./api/place-list')],
  ['/api/place-lookup', () => import('./api/place-lookup')],
  ['/api/place-review', () => import('./api/place-review')],
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
    return {
      handlerPath: '/api/auth/logout',
      requestOverrides: {
        method: 'POST',
      },
    }
  }

  if (method === 'PATCH' && pathname === '/api/auth/profile') {
    return {
      handlerPath: '/api/auth/profile',
      requestOverrides: {
        method: 'POST',
      },
    }
  }

  if (method === 'GET' && pathname === '/api/places') {
    return { handlerPath: '/api/place-list' }
  }

  const placeDetailMatch = pathname.match(/^\/api\/places\/([^/]+)$/)
  if (method === 'GET' && placeDetailMatch) {
    return {
      handlerPath: '/api/place-detail',
      requestOverrides: {
        query: {
          placeId: decodeURIComponent(placeDetailMatch[1]),
        },
      },
    }
  }

  if (method === 'POST' && pathname === '/api/place-lookups') {
    return { handlerPath: '/api/place-lookup' }
  }

  if (method === 'POST' && pathname === '/api/place-submissions') {
    const rawBody = await readRequestBody(req)
    const parsedBody = asRecord(parseRequestBody(req, rawBody))

    return {
      handlerPath: '/api/place-entry',
      requestOverrides: {
        body: {
          ...parsedBody,
          confirmDuplicate: false,
        },
      },
    }
  }

  const confirmationMatch = pathname.match(/^\/api\/place-submissions\/([^/]+)\/confirmations$/)
  if (method === 'POST' && confirmationMatch) {
    const decodedDraft = decodePlaceSubmissionId(confirmationMatch[1])
    if (!decodedDraft) {
      return null
    }

    return {
      handlerPath: '/api/place-entry',
      requestOverrides: {
        body: {
          ...decodedDraft,
          confirmDuplicate: true,
        },
      },
    }
  }

  const placeReviewMatch = pathname.match(/^\/api\/places\/([^/]+)\/reviews$/)
  if (method === 'POST' && placeReviewMatch) {
    const rawBody = await readRequestBody(req)
    const parsedBody = asRecord(parseRequestBody(req, rawBody))

    return {
      handlerPath: '/api/place-review',
      requestOverrides: {
        body: {
          ...parsedBody,
          allowOverwrite: false,
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

  if (requestOverrides?.method) {
    vercelRequest.method = requestOverrides.method
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
    server.middlewares.use('/api', async (req, res, next) => {
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

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'PUBLIC_'],
  plugins: [react(), tailwindcss(), apiDevPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
