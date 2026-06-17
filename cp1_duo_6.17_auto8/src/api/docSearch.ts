import axios from 'axios'

const BASE_URL = 'http://localhost:5000/api'
const BOOKMARKS_STORAGE_KEY = 'docrover_bookmarks'

export const SEARCH_DEBOUNCE_MS = 500

export interface DocItem {
  id: number
  techStack: string
  title: string
  description: string
  codeSnippet: string
}

export interface SearchResponse {
  data: DocItem[]
  total: number
}

export interface DetailResponse {
  data: DocItem
}

export async function fetchDocs(query: string, techStack: string[] = []): Promise<DocItem[]> {
  try {
    const params: Record<string, string> = {
      q: query,
    }
    if (techStack.length > 0) {
      params.tech = techStack.join(',')
    }

    const response = await axios.get<SearchResponse>(`${BASE_URL}/docs/search`, { params })
    return response.data.data
  } catch (error) {
    console.error('Error fetching docs:', error)
    return []
  }
}

export async function getDocById(id: number): Promise<DocItem | null> {
  try {
    const response = await axios.get<DetailResponse>(`${BASE_URL}/docs/detail`, {
      params: { id },
    })
    return response.data.data
  } catch (error) {
    console.error(`Error fetching doc ${id}:`, error)
    return null
  }
}

export async function getDocsByIds(ids: number[]): Promise<DocItem[]> {
  const results: DocItem[] = []
  for (const id of ids) {
    const doc = await getDocById(id)
    if (doc) {
      results.push(doc)
    }
  }
  return results
}

export function getFavorites(): number[] {
  try {
    const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function isFavorite(id: number): boolean {
  const favorites = getFavorites()
  return favorites.includes(id)
}

function saveFavorites(favorites: number[]): void {
  localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(favorites))
  window.dispatchEvent(new Event('bookmarkChange'))
}

export function addFavorite(id: number): void {
  const favorites = getFavorites()
  if (!favorites.includes(id)) {
    const newFavorites = [...favorites, id]
    saveFavorites(newFavorites)
  }
}

export function removeFavorite(id: number): void {
  const favorites = getFavorites()
  const newFavorites = favorites.filter((f) => f !== id)
  saveFavorites(newFavorites)
}

export function toggleFavorite(id: number): boolean {
  const favorites = getFavorites()
  if (favorites.includes(id)) {
    removeFavorite(id)
    return false
  } else {
    addFavorite(id)
    return true
  }
}
