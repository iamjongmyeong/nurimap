import { Agentation } from 'agentation'
import { NurimapAppShell } from './app-shell/NurimapAppShell'
import { AuthProvider } from './auth/AuthProvider'

const AGENTATION_ENDPOINT = 'http://localhost:4747'
const shouldRenderAgentation = import.meta.env.MODE === 'development'

function App() {
  return (
    <AuthProvider>
      <NurimapAppShell />
      {shouldRenderAgentation ? <Agentation endpoint={AGENTATION_ENDPOINT} /> : null}
    </AuthProvider>
  )
}

export default App
