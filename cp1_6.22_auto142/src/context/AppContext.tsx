import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '../types'

interface AppContextType {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  loading: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const DEFAULT_USER_ID = 'user-1'

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/users/${DEFAULT_USER_ID}`)
        if (res.ok) {
          const user = await res.json()
          setCurrentUser(user)
        }
      } catch (err) {
        console.error('Failed to fetch user:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, loading }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
