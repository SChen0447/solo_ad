export interface Bookmark {
  id: string
  url: string
  title: string
  favicon: string
  note: string
  tags: string[]
  folderId: string | null
  createdAt: string
  shareCode: string | null
}

export interface Folder {
  id: string
  name: string
  collapsed: boolean
  bookmarks?: Bookmark[]
}

export interface FetchUrlResult {
  title: string
  favicon: string
}

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error || 'Request failed')
  }
  return json.data as T
}

export async function getBookmarks(): Promise<Bookmark[]> {
  return request<Bookmark[]>('/bookmarks')
}

export async function searchBookmarks(q: string, tags: string[]): Promise<Bookmark[]> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (tags.length > 0) params.set('tags', tags.join(','))
  const query = params.toString()
  return request<Bookmark[]>(`/bookmarks/search${query ? `?${query}` : ''}`)
}

export async function getAllTags(): Promise<string[]> {
  return request<string[]>('/bookmarks/tags')
}

export async function fetchUrlInfo(url: string): Promise<FetchUrlResult> {
  return request<FetchUrlResult>('/bookmarks/fetch-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

export async function addBookmark(data: {
  url: string
  title?: string
  note?: string
  tags?: string[]
  folderId?: string | null
}): Promise<Bookmark> {
  return request<Bookmark>('/bookmarks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateBookmark(
  id: string,
  data: Partial<Bookmark>
): Promise<Bookmark> {
  return request<Bookmark>(`/bookmarks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteBookmark(id: string): Promise<void> {
  return request<void>(`/bookmarks/${id}`, { method: 'DELETE' })
}

export async function batchDelete(ids: string[]): Promise<void> {
  return request<void>('/bookmarks/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function batchTag(ids: string[], tags: string[]): Promise<void> {
  return request<void>('/bookmarks/batch-tag', {
    method: 'POST',
    body: JSON.stringify({ ids, tags }),
  })
}

export async function batchMove(ids: string[], folderId: string): Promise<void> {
  return request<void>('/bookmarks/batch-move', {
    method: 'POST',
    body: JSON.stringify({ ids, folderId }),
  })
}

export async function shareBookmark(id: string): Promise<{ shareCode: string }> {
  return request<{ shareCode: string }>(`/bookmarks/${id}/share`, {
    method: 'POST',
  })
}

export async function getFolders(): Promise<Folder[]> {
  return request<Folder[]>('/folders')
}

export async function createFolder(name: string): Promise<Folder> {
  return request<Folder>('/folders', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function updateFolder(
  id: string,
  data: Partial<Folder>
): Promise<Folder> {
  return request<Folder>(`/folders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteFolder(id: string): Promise<void> {
  return request<void>(`/folders/${id}`, { method: 'DELETE' })
}
