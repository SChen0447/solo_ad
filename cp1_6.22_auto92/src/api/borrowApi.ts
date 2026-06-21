import type { BorrowRecord } from '@/models/types'

const BASE = '/api'

export async function fetchBorrowTimeline(bookId: string): Promise<BorrowRecord[]> {
  const res = await fetch(`${BASE}/borrows/${bookId}`)
  return res.json()
}

export async function borrowBook(bookId: string, borrower: string): Promise<BorrowRecord> {
  const res = await fetch(`${BASE}/borrows/borrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId, borrower }),
  })
  return res.json()
}

export async function returnBook(bookId: string): Promise<BorrowRecord> {
  const res = await fetch(`${BASE}/borrows/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId }),
  })
  return res.json()
}
