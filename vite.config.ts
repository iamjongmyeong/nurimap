import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { lookupPlaceFromRawUrl } from './src/server/placeLookupService'

const placeLookupDevPlugin = (): Plugin => ({
  name: 'place-lookup-dev-plugin',
  configureServer(server) {
    server.middlewares.use('/api/place-lookup', async (req, res, next) => {
      if (req.method !== 'POST') {
        next()
        return
      }

      const body = await new Promise<string>((resolve, reject) => {
        let data = ''
        req.on('data', (chunk) => {
          data += chunk
        })
        req.on('end', () => resolve(data))
        req.on('error', reject)
      })

      const parsedBody = body ? (JSON.parse(body) as { rawUrl?: string }) : {}
      const result = await lookupPlaceFromRawUrl(parsedBody.rawUrl ?? '')
      const statusCode = result.status === 'error'
        ? result.error.code === 'lookup_failed'
          ? 502
          : 422
        : 200

      res.statusCode = statusCode
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result))
    })
  },
})

export default defineConfig({
  envPrefix: ['VITE_', 'PUBLIC_'],
  plugins: [react(), tailwindcss(), placeLookupDevPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
