import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 2000,
})

export interface Event {
  id: string
  name: string
  description: string
  signinCode: string
  createdAt: string
}

export interface Message {
  id: string
  eventId: string
  nickname: string
  content: string
  imageUrl?: string
  timestamp: string
  isPinned: boolean
}

export interface SigninResult {
  success: boolean
  eventId: string
  nickname: string
}

export const createEvent = async (name: string, description: string): Promise<Event> => {
  const response = await api.post('/events', { name, description })
  return response.data
}

export const getEvent = async (eventId: string): Promise<Event> => {
  const response = await api.get(`/events/${eventId}`)
  return response.data
}

export const getEventByCode = async (signinCode: string): Promise<Event> => {
  const response = await api.get(`/events/code/${signinCode}`)
  return response.data
}

export const signin = async (eventId: string, nickname: string): Promise<SigninResult> => {
  const response = await api.post(`/events/${eventId}/signin`, { nickname })
  return response.data
}

export const getMessages = async (eventId: string): Promise<Message[]> => {
  const response = await api.get(`/events/${eventId}/messages`)
  return response.data
}

export const sendMessage = async (
  eventId: string,
  nickname: string,
  content: string,
  imageFile?: File
): Promise<Message> => {
  const formData = new FormData()
  formData.append('nickname', nickname)
  formData.append('content', content)
  if (imageFile) {
    formData.append('image', imageFile)
  }
  const response = await api.post(`/events/${eventId}/messages`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const pinMessage = async (eventId: string, messageId: string, organizerToken: string): Promise<Message> => {
  const response = await api.post(`/events/${eventId}/messages/${messageId}/pin`, { organizerToken })
  return response.data
}

export const deleteMessage = async (eventId: string, messageId: string, organizerToken: string): Promise<void> => {
  await api.delete(`/events/${eventId}/messages/${messageId}`, {
    data: { organizerToken },
  })
}

export default api
