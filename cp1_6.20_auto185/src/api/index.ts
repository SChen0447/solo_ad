import axios from 'axios'

export interface Category {
  key: string
  label: string
  color: string
}

export interface Inspiration {
  id: string
  category: string
  title: string
  author: string
  likes: number
  beforeImage: string
  afterImage: string
}

export interface ProcessPhoto {
  url: string
  description: string
}

export interface RecordStep {
  goal: string
  estimatedTime: string
  tools: string[]
  processPhotos: ProcessPhoto[]
  finalImages: string[]
  reflection: string
}

export interface Record {
  id: string
  userId: string
  inspirationId: string
  category: string
  steps: RecordStep
  createdAt: string
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get('/categories')
  return response.data
}

export const identifyItem = async (
  imageBase64: string,
  features: number[]
): Promise<{ category: string }> => {
  const response = await api.post('/identify', {
    image: imageBase64,
    features,
  })
  return response.data
}

export const getInspirations = async (
  category?: string
): Promise<Inspiration[]> => {
  const url = category ? `/inspirations?category=${encodeURIComponent(category)}` : '/inspirations'
  const response = await api.get(url)
  return response.data
}

export const saveRecord = async (record: Omit<Record, 'id' | 'createdAt'>): Promise<Record> => {
  const response = await api.post('/records', record)
  return response.data
}

export const getUserRecords = async (userId: string): Promise<Record[]> => {
  const response = await api.get(`/records/${userId}`)
  return response.data
}
