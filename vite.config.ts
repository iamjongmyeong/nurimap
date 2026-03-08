import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import type { IncomingMessage } from 'node:http'
import { defineConfig } from 'vitest/config'
import { requestLoginLink, verifyAccessToken, verifyLoginLink } from './src/server/authService'
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
    server.middlewares.use('/api/auth/request-link', async (req, res, next) => {
      if (req.method !== 'POST') {
        next()
        return
      }
      const body = await readJsonBody(req)
      const parsedBody = body ? (JSON.parse(body) as { email?: string }) : {}
      const result = await requestLoginLink(parsedBody.email ?? '')
      const statusCode = result.status === 'error' ? (result.code === 'invalid_domain' ? 400 : result.code === 'delivery_failed' ? 502 : 429) : 200
      res.statusCode = statusCode
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result))
    })

    server.middlewares.use('/api/auth/verify-link', async (req, res, next) => {
      if (req.method !== 'POST') {
        next()
        return
      }
      const body = await readJsonBody(req)
      const parsedBody = body ? (JSON.parse(body) as { email?: string; nonce?: string }) : {}
      const result = await verifyLoginLink({ email: parsedBody.email ?? '', nonce: parsedBody.nonce ?? '' })
      res.statusCode = result.status === 'error' ? 400 : 200
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
