import { type ComponentType, useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { NurimapAppShell } from './app-shell/NurimapAppShell'
import { AuthProvider } from './auth/AuthProvider'

const shouldEnableAgentation = import.meta.env.DEV && import.meta.env.VITE_ENABLE_AGENTATION === 'true'

let AgentationGate: ComponentType = function AgentationGate() {
  return null
}

if (shouldEnableAgentation) {
  const agentationEndpoint = import.meta.env.VITE_AGENTATION_ENDPOINT ?? 'http://localhost:4747'

  AgentationGate = function AgentationGate() {
    const [AgentationComponent, setAgentationComponent] = useState<ComponentType<{ endpoint?: string }> | null>(null)

    useEffect(() => {
      const abortController = new AbortController()
      let isMounted = true

      const loadAgentation = async () => {
        try {
          const healthUrl = new URL('/health', agentationEndpoint)
          const response = await fetch(healthUrl, {
            signal: abortController.signal,
          })

          if (!isMounted || !response.ok) {
            return
          }

          const module = await import('agentation')
          if (isMounted) {
            setAgentationComponent(() => module.Agentation)
          }
        } catch {
          if (isMounted) {
            setAgentationComponent(null)
          }
        }
      }

      void loadAgentation()

      return () => {
        isMounted = false
        abortController.abort()
      }
    }, [])

    return AgentationComponent ? <AgentationComponent endpoint={agentationEndpoint} /> : null
  }
}

function App() {
  return (
    <>
      <AuthProvider>
        <NurimapAppShell />
      </AuthProvider>
      <AgentationGate />
      <Analytics />
    </>
  )
}

export default App
