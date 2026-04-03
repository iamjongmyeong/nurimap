import { type ComponentType, useEffect, useLayoutEffect, useSyncExternalStore, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { NurimapAppShell } from './app-shell/NurimapAppShell'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/authContext'
import { isLoginRoutePathname, readLoginRouteHistoryState } from './auth/loginRouteState'

const subscribeToLocation = (callback: () => void) => {
  window.addEventListener('popstate', callback)
  return () => {
    window.removeEventListener('popstate', callback)
  }
}

const getLocationPathname = () => window.location.pathname

const navigateToPath = (path: string, replace = false, historyState: Record<string, unknown> = {}) => {
  if (window.location.pathname === path) {
    window.history.replaceState(historyState, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
    return
  }

  if (replace) {
    window.history.replaceState(historyState, '', path)
  } else {
    window.history.pushState(historyState, '', path)
  }

  window.dispatchEvent(new PopStateEvent('popstate'))
}

const LoginRouteController = ({ pathname }: { pathname: string }) => {
  const { phase } = useAuth()

  useLayoutEffect(() => {
    if (!isLoginRoutePathname(pathname) || phase !== 'authenticated') {
      return
    }

    const loginRouteState = readLoginRouteHistoryState(window.history.state)
    if (loginRouteState?.loginPostAuthPath) {
      navigateToPath(
        loginRouteState.loginPostAuthPath,
        true,
        loginRouteState.loginPostAuthState ?? {},
      )
      return
    }

    navigateToPath('/', true, {})
  }, [pathname, phase])

  return null
}

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
  const pathname = useSyncExternalStore(subscribeToLocation, getLocationPathname, getLocationPathname)
  const authRouteActive = isLoginRoutePathname(pathname)

  return (
    <>
      <AuthProvider authRouteActive={authRouteActive}>
        <LoginRouteController pathname={pathname} />
        {authRouteActive ? null : <NurimapAppShell />}
      </AuthProvider>
      <AgentationGate />
      <Analytics />
    </>
  )
}

export default App
