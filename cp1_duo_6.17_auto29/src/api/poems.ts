import axios from 'axios'

export interface Palette {
  id: number
  name: string
  primary: string
  secondary: string
  background: string
  text: string
  accent: string
}

export interface Texture {
  id: number
  name: string
  svg: string
}

export interface FontOption {
  id: string
  name: string
  family: string
}

export interface Poem {
  id: string
  title: string
  poet: string
  content: string
  palette_id: number
  font_id: string
  texture_id: number
  favorites: number
  created_at: string
}

export interface PoemCreate {
  title: string
  poet: string
  content: string
  palette_id: number
  font_id: string
  texture_id: number
}

export interface Note {
  poem_id: string
  poem_title: string
  content: string
  updated_at: string
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export const getPalettes = async (): Promise<Palette[]> => {
  const res = await api.get('/palettes')
  return res.data
}

export const getTextures = async (): Promise<Texture[]> => {
  const res = await api.get('/textures')
  return res.data
}

export const getFonts = async (): Promise<FontOption[]> => {
  const res = await api.get('/fonts')
  return res.data
}

export const getPoems = async (page: number = 1, limit: number = 12): Promise<{ poems: Poem[]; hasMore: boolean }> => {
  const res = await api.get('/poems', { params: { page, limit } })
  return res.data
}

export const getPoem = async (id: string): Promise<Poem> => {
  const res = await api.get(`/poems/${id}`)
  return res.data
}

export const createPoem = async (poem: PoemCreate): Promise<Poem> => {
  const res = await api.post('/poems', poem)
  return res.data
}

export const favoritePoem = async (id: string): Promise<{ favorites: number }> => {
  const res = await api.post(`/poems/${id}/favorite`)
  return res.data
}

export const getNote = async (poemId: string): Promise<Note | null> => {
  try {
    const res = await api.get(`/notes/${poemId}`)
    return res.data
  } catch (e: any) {
    if (e.response?.status === 404) return null
    throw e
  }
}

export const saveNote = async (poemId: string, poemTitle: string, content: string): Promise<Note> => {
  const res = await api.put(`/notes/${poemId}`, { poem_title: poemTitle, content })
  return res.data
}

export const searchNotes = async (query: string): Promise<Note[]> => {
  const res = await api.get('/notes', { params: { q: query } })
  return res.data
}

export const login = async (username: string, password: string): Promise<{ token: string }> => {
  const res = await api.post('/auth/login', { username, password })
  return res.data
}

export const register = async (username: string, password: string): Promise<{ token: string }> => {
  const res = await api.post('/auth/register', { username, password })
  return res.data
}
