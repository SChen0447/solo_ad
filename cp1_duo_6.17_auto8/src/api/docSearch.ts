import axios from 'axios'

const BASE_URL = 'http://localhost:5000/api'

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
