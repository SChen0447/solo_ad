import type { MediaItem, CreateItemInput, UpdateItemInput, StatsData } from './types'

const BASE = '/api'

async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchItems(): Promise<MediaItem[]> {
  const res = await fetch(`${BASE}/items`)
  return handleRes<MediaItem[]>(res)
}

export async function addItem(input: CreateItemInput): Promise<MediaItem> {
  const res = await fetch(`${BASE}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  return handleRes<MediaItem>(res)
}

export async function updateItem(id: string, input: UpdateItemInput): Promise<MediaItem> {
  const res = await fetch(`${BASE}/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  return handleRes<MediaItem>(res)
}

export async function deleteItem(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/items/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  return handleRes<{ success: boolean }>(res)
}

export async function fetchTags(): Promise<string[]> {
  const res = await fetch(`${BASE}/tags`)
  return handleRes<string[]>(res)
}

export async function fetchStats(): Promise<StatsData> {
  const res = await fetch(`${BASE}/stats`)
  return handleRes<StatsData>(res)
}
