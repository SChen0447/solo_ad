import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Notification } from '../types'
import { v4 as uuidv4 } from 'uuid'

interface NotificationContextValue {
  showNotification: (type: 'success' | 'error', message: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return ctx
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<(Notification & { fading?: boolean })[]>([])

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    const id = uuidv4()
    setNotifications(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, fading: true } : n))
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, 300)
    }, 2700)
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      <div className="notification-container">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`notification ${n.type} ${n.fading ? 'fade-out' : ''}`}
          >
            {n.message}
          </div>
        ))}
      </div>
      {children}
    </NotificationContext.Provider>
  )
}
