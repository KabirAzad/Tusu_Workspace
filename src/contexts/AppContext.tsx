'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Profile } from '@/types/database'

interface AppContextValue {
  profile: Profile
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({
  profile,
  children,
}: {
  profile: Profile
  children: ReactNode
}) {
  return <AppContext.Provider value={{ profile }}>{children}</AppContext.Provider>
}

/** Access the current user's profile from any client component */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used inside AppProvider')
  }
  return ctx
}
