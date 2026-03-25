import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from 'vitest/config'

type DevApiRouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void
type DevApiQuery = Record<string, string | string[]>
type DevApiRouteModule = { default: DevApiRouteHandler }

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

const runDevApiRoute = async ({
  handler,
  req,
  res,
}: {
  handler: DevApiRouteHandler
  req: IncomingMessage
  res: ServerResponse<IncomingMessage>
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

  vercelRequest.query = parseRequestQuery(req.url)
  if (vercelRequest.body === undefined && req.method !== 'GET' && req.method !== 'HEAD') {
    const rawBody = await readRequestBody(req)
    vercelRequest.body = parseRequestBody(req, rawBody)
  }

  await handler(vercelRequest, vercelResponse)
}

const apiDevPlugin = (): Plugin => ({
  name: 'nurimap-api-dev-plugin',
  configureServer(server) {
    const registerDevApiRoute = (path: string, handler: DevApiRouteHandler) => {
      server.middlewares.use(path, async (req, res, next) => {
        try {
          await runDevApiRoute({ handler, req, res })
        } catch (error) {
          next(error as Error)
        }
      })
    }

    for (const path of DEV_API_ROUTE_LOADERS.keys()) {
      registerDevApiRoute(path, async (req, res) => {
        const handler = await loadDevApiRouteHandler(path)
        await handler(req, res)
      })
    }
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
