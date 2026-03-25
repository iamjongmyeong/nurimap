import { type ComponentType, useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { NurimapAppShell } from './app-shell/NurimapAppShell'
import { AuthProvider } from './auth/AuthProvider'

function AgentationGate() {
  const shouldEnableAgentation = import.meta.env.DEV && import.meta.env.VITE_ENABLE_AGENTATION === 'true'
  const agentationEndpoint = import.meta.env.VITE_AGENTATION_ENDPOINT ?? 'http://localhost:4747'
  const [AgentationComponent, setAgentationComponent] = useState<ComponentType<{ endpoint?: string }> | null>(null)
  const [resolvedAgentationEndpoint, setResolvedAgentationEndpoint] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!shouldEnableAgentation) {
      setAgentationComponent(null)
      setResolvedAgentationEndpoint(undefined)
      return
    }

    const abortController = new AbortController()
    let isMounted = true

    const loadAgentation = async () => {
      try {
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

    const resolveAgentationEndpoint = async () => {
      try {
        const healthUrl = new URL('/health', agentationEndpoint)
        const response = await fetch(healthUrl, {
          signal: abortController.signal,
        })

        if (isMounted) {
          setResolvedAgentationEndpoint(response.ok ? agentationEndpoint : undefined)
        }
      } catch {
        if (isMounted) {
          setResolvedAgentationEndpoint(undefined)
        }
      }
    }

    void loadAgentation()
    void resolveAgentationEndpoint()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [agentationEndpoint, shouldEnableAgentation])

  if (!shouldEnableAgentation || !AgentationComponent) {
    return null
  }

  return <AgentationComponent endpoint={resolvedAgentationEndpoint} />
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
