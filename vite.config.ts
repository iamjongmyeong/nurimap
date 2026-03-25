import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from 'vitest/config'
import {
  getAuthenticatedSession,
  requestLoginOtp,
  verifyAccessToken,
  verifyLoginOtp,
} from './src/server/authService'
import {
  APP_CSRF_HEADER_NAME,
  readSessionIdFromCookieHeader,
  serializeAppSessionCookie,
  serializeCsrfCookie,
} from './src/server/appSessionService'
import { getPlaceDetailForUser, listPlacesForUser } from './src/server/placeDataService'
import { preparePlaceEntryFromDraft } from './src/server/placeEntryService'
import { lookupPlaceFromRawUrl } from './src/server/placeLookupService'

const readJsonBody = async (req: IncomingMessage) => {
  return await new Promise<string>((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

const getHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

const normalizeHttpUrl = (rawValue: string | null | undefined) => {
  if (!rawValue) {
    return null
  }

  try {
    const parsedUrl = new URL(rawValue.trim())
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return null
    }

    if (parsedUrl.hash) {
      parsedUrl.hash = ''
    }

    const normalizedUrl = parsedUrl.toString()
    if (parsedUrl.pathname === '/' && !parsedUrl.search) {
      return normalizedUrl.replace(/\/$/, '')
    }

    return normalizedUrl
  } catch {
    return null
  }
}

const getRuntimeOriginFromRequest = (req: IncomingMessage) => {
  const originHeader = getHeaderValue(req.headers.origin)
  const normalizedOrigin = normalizeHttpUrl(originHeader)
  if (normalizedOrigin) {
    return normalizedOrigin
  }

  const hostHeader = getHeaderValue(req.headers['x-forwarded-host']) ?? getHeaderValue(req.headers.host)
  if (!hostHeader) {
    return null
  }

  const forwardedProtoHeader = getHeaderValue(req.headers['x-forwarded-proto'])
  const protocol = forwardedProtoHeader?.split(',')[0]?.trim() || 'http'
  return normalizeHttpUrl(`${protocol}://${hostHeader}`)
}

const isSecureRequest = (req: IncomingMessage) =>
  process.env.NODE_ENV === 'production' || getHeaderValue(req.headers['x-forwarded-proto']) === 'https'

const apiDevPlugin = (): Plugin => ({
  name: 'nurimap-api-dev-plugin',
  configureServer(server) {
    const handleAuthRequest = async (
      req: IncomingMessage,
      res: ServerResponse<IncomingMessage>,
      next: () => void,
      handler: typeof requestLoginOtp,
    ) => {
      if (req.method !== 'POST') {
        next()
        return
      }

      const body = await readJsonBody(req)
      const parsedBody = body ? (JSON.parse(body) as { email?: string; requireBypass?: boolean }) : {}
      const result = await handler(parsedBody.email ?? '', {
        requireBypass: parsedBody.requireBypass === true,
        runtimeOrigin: getRuntimeOriginFromRequest(req) ?? undefined,
      })
      const statusCode = result.status === 'error'
        ? result.code === 'delivery_failed'
          ? 502
          : result.code === 'cooldown'
            ? 429
            : 400
        : 200
      res.statusCode = statusCode
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result))
    }

    server.middlewares.use('/api/auth/session', async (req, res, next) => {
      if (req.method !== 'GET') {
        next()
        return
      }

      const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
      const result = await getAuthenticatedSession(sessionId)
      res.statusCode = 200
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
      res.setHeader('Content-Type', 'application/json')
      if (result.status === 'missing') {
        res.end(JSON.stringify({ status: 'missing' }))
        return
      }

      res.end(JSON.stringify({
        status: 'authenticated',
        user: result.user,
        csrfHeaderName: APP_CSRF_HEADER_NAME,
      }))
    })

    server.middlewares.use('/api/auth/request-otp', async (req, res, next) => {
      await handleAuthRequest(req, res, next, requestLoginOtp)
    })

    server.middlewares.use('/api/auth/request-link', async (req, res, next) => {
      await handleAuthRequest(req, res, next, requestLoginOtp)
    })

    server.middlewares.use('/api/auth/verify-otp', async (req, res, next) => {
      if (req.method !== 'POST') {
        next()
        return
      }

      const body = await readJsonBody(req)
      const parsedBody = body
        ? (JSON.parse(body) as {
            email?: string
            token?: string
            tokenHash?: string
            verificationType?: 'magiclink' | 'signup' | 'invite'
          })
        : {}

      const result = await verifyLoginOtp({
        email: parsedBody.email ?? '',
        runtimeOrigin: getRuntimeOriginFromRequest(req) ?? undefined,
        token: parsedBody.token ?? '',
        tokenHash: parsedBody.tokenHash,
        verificationType: parsedBody.verificationType,
      })

      res.setHeader('Content-Type', 'application/json')
      if (result.status === 'error') {
        res.statusCode = 400
        res.end(JSON.stringify(result))
        return
      }

      const secure = isSecureRequest(req)
      res.statusCode = 200
      res.setHeader('Set-Cookie', [
        serializeAppSessionCookie({
          sessionId: result.sessionId,
          secure,
        }),
        serializeCsrfCookie({
          csrfToken: result.csrfToken,
          secure,
        }),
      ])
      res.end(JSON.stringify({
        status: 'success',
        nextPhase: result.nextPhase,
        user: result.user,
        csrfHeaderName: APP_CSRF_HEADER_NAME,
      }))
    })

    server.middlewares.use('/api/place-entry', async (req, res, next) => {
      if (req.method !== 'POST') {
        next()
        return
      }

      const authorization = req.headers.authorization
      const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
      const user = accessToken ? await verifyAccessToken(accessToken) : null
      if (!user) {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'Unauthorized' } }))
        return
      }

      const body = await readJsonBody(req)
      const parsedBody = body ? (JSON.parse(body) as { name?: string; roadAddress?: string; landLotAddress?: string }) : {}
      const result = await preparePlaceEntryFromDraft({
        name: parsedBody.name ?? '',
        roadAddress: parsedBody.roadAddress ?? '',
        landLotAddress: parsedBody.landLotAddress ?? null,
      })
      res.statusCode = result.status === 'error' ? 422 : 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result))
    })

    server.middlewares.use('/api/place-list', async (req, res, next) => {
      if (req.method !== 'GET') {
        next()
        return
      }

      const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
      const authSession = await getAuthenticatedSession(sessionId)
      if (authSession.status === 'missing') {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'Unauthorized' } }))
        return
      }

      const places = await listPlacesForUser(authSession.user.id)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ status: 'success', places }))
    })

    server.middlewares.use('/api/place-detail', async (req, res, next) => {
      if (req.method !== 'GET') {
        next()
        return
      }

      const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
      const authSession = await getAuthenticatedSession(sessionId)
      if (authSession.status === 'missing') {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'Unauthorized' } }))
        return
      }

      const requestUrl = new URL(req.url ?? '/api/place-detail', 'http://localhost')
      const placeId = requestUrl.searchParams.get('placeId') ?? ''
      const place = await getPlaceDetailForUser({
        placeId,
        viewerUserId: authSession.user.id,
      })

      if (!place) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'Place not found.' } }))
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ status: 'success', place }))
    })

    server.middlewares.use('/api/place-lookup', async (req, res, next) => {
      if (req.method !== 'POST') {
        next()
        return
      }

      const authorization = req.headers.authorization
      const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
      const user = accessToken ? await verifyAccessToken(accessToken) : null
      if (!user) {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'Unauthorized' } }))
        return
      }

      const body = await readJsonBody(req)
      const parsedBody = body ? (JSON.parse(body) as { rawUrl?: string }) : {}
      const result = await lookupPlaceFromRawUrl(parsedBody.rawUrl ?? '')
      const statusCode = result.status === 'error' ? (result.error.code === 'lookup_failed' ? 502 : 422) : 200
      res.statusCode = statusCode
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result))
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
