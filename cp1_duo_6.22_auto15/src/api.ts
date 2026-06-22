export type ReviewGrade = 'hard' | 'normal' | 'easy'

export interface Card {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: number
  lastReviewedAt: number | null
  nextReviewAt: number
  repetitions: number
  easeFactor: number
  interval: number
}

export interface TagInfo {
  name: string
  count: number
}

export type ViewMode = 'list' | 'review' | 'editor'

function getQueryString(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  if (entries.length === 0) return ''
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`).join('&')
}

export async function fetchCards(search?: string, tag?: string): Promise<Card[]> {
  const res = await fetch(`/api/cards${getQueryString({ search, tag })}`)
  if (!res.ok) throw new Error('获取卡片失败')
  return res.json()
}

export async function fetchDueCards(): Promise<Card[]> {
  const res = await fetch('/api/cards/due')
  if (!res.ok) throw new Error('获取待复习卡片失败')
  return res.json()
}

export async function fetchTags(): Promise<TagInfo[]> {
  const res = await fetch('/api/tags')
  if (!res.ok) throw new Error('获取标签失败')
  return res.json()
}

export async function createCard(data: { title: string; content: string; tags: string[] }): Promise<Card> {
  const res = await fetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '创建失败' }))
    throw new Error(err.error)
  }
  return res.json()
}

export async function updateCard(id: string, data: Partial<{ title: string; content: string; tags: string[] }>): Promise<Card> {
  const res = await fetch(`/api/cards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '更新失败' }))
    throw new Error(err.error)
  }
  return res.json()
}

export async function reviewCard(id: string, grade: ReviewGrade): Promise<Card> {
  const res = await fetch(`/api/cards/${id}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grade }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '复习失败' }))
    throw new Error(err.error)
  }
  return res.json()
}

export async function deleteCard(id: string): Promise<void> {
  const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

export function formatDate(ts: number | null): string {
  if (!ts) return '从未'
  const d = new Date(ts)
  const now = new Date()
  const diff = ts - now.getTime()
  const oneDay = 24 * 60 * 60 * 1000
  if (Math.abs(diff) < oneDay) {
    if (diff < 0) return '今天（已到期）'
    return '今天'
  }
  if (diff > 0 && diff < oneDay * 2) return '明天'
  if (diff < 0 && diff > -oneDay * 2) return '昨天（已到期）'
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export function renderMarkdownSimple(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>')
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  html = html.replace(/\n\n/g, '</p><p>')
  html = html.replace(/\n/g, '<br/>')
  return `<p>${html}</p>`
}
