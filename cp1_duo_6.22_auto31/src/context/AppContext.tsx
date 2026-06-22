import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { PostcardData, GuestMessage } from '../types'
import { api } from '../utils/api'

interface AppContextType {
  postcard: PostcardData | null
  messages: GuestMessage[]
  isUnlocked: boolean
  isLoading: boolean
  loadPostcard: (id: string) => Promise<void>
  addMessage: (nickname: string, content: string) => Promise<void>
  refreshMessages: () => Promise<void>
  syncMessages: () => Promise<boolean>
  setIsUnlocked: (unlocked: boolean) => void
  visitorId: string
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const generateVisitorId = (): string => {
  let id = localStorage.getItem('visitor_id')
  if (!id) {
    id = Math.random().toString(36).substring(2, 15)
    localStorage.setItem('visitor_id', id)
  }
  return id
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [postcard, setPostcard] = useState<PostcardData | null>(null)
  const [messages, setMessages] = useState<GuestMessage[]>([])
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [visitorId] = useState<string>(generateVisitorId())

  const loadPostcard = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      const data = await api.getPostcard(id)
      setPostcard(data)
      if (data) {
        const msgs = await api.getMessages(id)
        setMessages(msgs)
        const now = new Date()
        const unlock = new Date(data.unlockDate)
        setIsUnlocked(now >= unlock)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addMessage = useCallback(async (nickname: string, content: string) => {
    if (!postcard) return
    const newMsg = await api.addMessage(postcard.id, nickname, content, visitorId)
    setMessages(prev => [...prev, newMsg])
  }, [postcard, visitorId])

  const refreshMessages = useCallback(async () => {
    if (!postcard) return
    const msgs = await api.getMessages(postcard.id)
    setMessages(msgs)
  }, [postcard])

  const syncMessages = useCallback(async (): Promise<boolean> => {
    if (!postcard) return false
    const msgs = await api.getMessages(postcard.id)
    
    let hasNewMessages = false
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id))
      const newMessages = msgs.filter(m => !existingIds.has(m.id))
      
      if (newMessages.length === 0) {
        return prev
      }
      
      hasNewMessages = true
      const allMessages = [...prev, ...newMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      return allMessages
    })
    
    return hasNewMessages
  }, [postcard])

  return (
    <AppContext.Provider
      value={{
        postcard,
        messages,
        isUnlocked,
        isLoading,
        loadPostcard,
        addMessage,
        refreshMessages,
        syncMessages,
        setIsUnlocked,
        visitorId
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
