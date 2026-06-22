import { PostcardData, GuestMessage } from '../types'

const POSTCARDS_KEY = 'time_postcards'
const MESSAGES_KEY = 'time_postcard_messages'

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

const getPostcards = (): Record<string, PostcardData> => {
  const data = localStorage.getItem(POSTCARDS_KEY)
  return data ? JSON.parse(data) : {}
}

const savePostcards = (postcards: Record<string, PostcardData>) => {
  localStorage.setItem(POSTCARDS_KEY, JSON.stringify(postcards))
}

const getMessages = (): GuestMessage[] => {
  const data = localStorage.getItem(MESSAGES_KEY)
  return data ? JSON.parse(data) : []
}

const saveMessages = (messages: GuestMessage[]) => {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages))
}

export const api = {
  createPostcard: async (imageUrl: string, unlockDate: string, message: string): Promise<PostcardData> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const postcards = getPostcards()
    const id = generateId()
    const postcard: PostcardData = {
      id,
      imageUrl,
      unlockDate,
      message,
      createdAt: new Date().toISOString()
    }
    postcards[id] = postcard
    savePostcards(postcards)
    return postcard
  },

  getPostcard: async (id: string): Promise<PostcardData | null> => {
    await new Promise(resolve => setTimeout(resolve, 200))
    const postcards = getPostcards()
    return postcards[id] || null
  },

  addMessage: async (postcardId: string, nickname: string, content: string, visitorId: string): Promise<GuestMessage> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const messages = getMessages()
    const newMessage: GuestMessage = {
      id: generateId(),
      postcardId,
      nickname,
      content,
      createdAt: new Date().toISOString(),
      visitorId
    }
    messages.push(newMessage)
    saveMessages(messages)
    return newMessage
  },

  getMessages: async (postcardId: string): Promise<GuestMessage[]> => {
    await new Promise(resolve => setTimeout(resolve, 200))
    const messages = getMessages()
    return messages
      .filter(m => m.postcardId === postcardId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }
}
