export type CardColumn = 'highlight' | 'improvement' | 'action'

export interface Card {
  id: string
  team: string
  author: string
  content: string
  column: CardColumn
  createdAt: number
  updatedAt: number
}

export interface ReportStats {
  totalCards: number
  columnCounts: { [key in CardColumn]: number }
  memberCounts: { member: string; count: number }[]
  cards: Card[]
}

const API_BASE = '/api'

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export async function getCards(team: string): Promise<Card[]> {
  return request<Card[]>(`/cards?team=${encodeURIComponent(team)}`)
}

export async function createCard(
  team: string,
  author: string,
  content: string,
  column: CardColumn
): Promise<Card> {
  return request<Card>('/cards', {
    method: 'POST',
    body: JSON.stringify({ team, author, content, column })
  })
}

export async function updateCard(id: string, content: string): Promise<Card> {
  return request<Card>(`/cards/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ content })
  })
}

export async function updateCardColumn(id: string, column: CardColumn): Promise<Card> {
  return request<Card>(`/cards/${id}/column`, {
    method: 'PUT',
    body: JSON.stringify({ column })
  })
}

export async function getReportStats(team: string): Promise<ReportStats> {
  return request<ReportStats>(`/report?team=${encodeURIComponent(team)}`)
}
