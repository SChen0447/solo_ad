import type { Book, Review, BookCategory } from '@/models/types'

const BASE = '/api'

export async function fetchBooks(params?: { category?: string; status?: string }): Promise<Book[]> {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.status) query.set('status', params.status)
  const res = await fetch(`${BASE}/books?${query.toString()}`)
  return res.json()
}

export async function fetchBook(id: string): Promise<Book> {
  const res = await fetch(`${BASE}/books/${id}`)
  return res.json()
}

export async function addBook(book: Omit<Book, 'id' | 'status' | 'borrowCount' | 'lastBorrower' | 'coverColor'>): Promise<Book> {
  const res = await fetch(`${BASE}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(book),
  })
  return res.json()
}

export async function updateBookStatus(id: string, status: 'available' | 'borrowed', borrower?: string): Promise<Book> {
  const res = await fetch(`${BASE}/books/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, borrower }),
  })
  return res.json()
}

export async function searchBooks(q: string): Promise<Book[]> {
  const res = await fetch(`${BASE}/books/search?q=${encodeURIComponent(q)}`)
  return res.json()
}

export async function fetchPopularBooks(): Promise<Book[]> {
  const res = await fetch(`${BASE}/books/popular`)
  return res.json()
}

export async function fetchBookReviews(bookId: string): Promise<Review[]> {
  const res = await fetch(`${BASE}/books/${bookId}/reviews`)
  return res.json()
}

export async function login(password: string): Promise<{ success: boolean; token?: string }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return res.json()
}

export async function verifyToken(token: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  return res.json()
}
