import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from 'vitest/config'
import { requestLoginOtp, verifyAccessToken } from './src/server/authService'
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
      const result = await handler(parsedBody.email ?? '', { requireBypass: parsedBody.requireBypass === true })
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

    server.middlewares.use('/api/auth/request-otp', async (req, res, next) => {
      await handleAuthRequest(req, res, next, requestLoginOtp)
    })

    server.middlewares.use('/api/auth/request-link', async (req, res, next) => {
      await handleAuthRequest(req, res, next, requestLoginOtp)
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
  envPrefix: ['VITE_', 'PUBLIC_'],
  plugins: [react(), tailwindcss(), apiDevPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
