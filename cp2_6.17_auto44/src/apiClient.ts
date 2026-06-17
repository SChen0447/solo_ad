import type {
  Shelf,
  Member,
  Book,
  DiscussionKeyword,
  Discussion,
  AverageProgress,
  JoinShelfResult,
  ReadingProgress,
} from './types'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export const apiClient = {
  getShelves: (): Promise<Shelf[]> => request<Shelf[]>('/shelves'),

  getShelf: (id: string): Promise<Shelf> => request<Shelf>(`/shelves/${id}`),

  createShelf: (data: { name: string; description: string }): Promise<Shelf> =>
    request<Shelf>('/shelves', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  joinShelf: (data: { inviteCode: string; nickname: string }): Promise<JoinShelfResult> =>
    request<JoinShelfResult>('/shelves/join', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getShelfMembers: (shelfId: string): Promise<Member[]> =>
    request<Member[]>(`/shelves/${shelfId}/members`),

  getShelfBooks: (shelfId: string): Promise<Book[]> =>
    request<Book[]>(`/shelves/${shelfId}/books`),

  addBook: (shelfId: string, data: { title: string; author: string; totalPages: number; memberId: string }): Promise<Book> =>
    request<Book>(`/shelves/${shelfId}/books`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProgress: (bookId: string, data: { currentPage: number; memberId: string }): Promise<ReadingProgress> =>
    request<ReadingProgress>(`/books/${bookId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAverageProgress: (shelfId: string): Promise<AverageProgress[]> =>
    request<AverageProgress[]>(`/shelves/${shelfId}/average-progress`),

  getWordCloud: (shelfId: string): Promise<DiscussionKeyword[]> =>
    request<DiscussionKeyword[]>(`/shelves/${shelfId}/wordcloud`),

  getDiscussions: (word?: string): Promise<Discussion[]> =>
    request<Discussion[]>(word ? `/discussions?word=${encodeURIComponent(word)}` : '/discussions'),
}
