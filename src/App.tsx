import { NurimapAppShell } from './app-shell/NurimapAppShell'
import { AuthProvider } from './auth/AuthProvider'

function App() {
  return (
    <AuthProvider>
      <NurimapAppShell />
    </AuthProvider>
  )
}

export default App
