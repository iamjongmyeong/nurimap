import { createContext, useContext } from 'react'

export type AuthPhase =
  | 'loading'
  | 'auth_required'
  | 'otp_required'
  | 'verifying'
  | 'auth_failure'
  | 'name_required'
  | 'authenticated'

export type AuthContextValue = {
  accessToken: string | null
  csrfHeaderName: string | null
  csrfToken: string | null
  email: string
  failureReason: string | null
  message: string | null
  phase: AuthPhase
  requestOtp: (email: string) => Promise<void>
  saveName: (name: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
