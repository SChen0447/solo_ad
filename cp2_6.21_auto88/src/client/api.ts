import type { Card, CardsResponse, Stats, BattleRequest, BattleResponse } from './types'

const API_BASE = '/api'

export async function getCards(page = 1, pageSize = 24): Promise<CardsResponse> {
  const res = await fetch(`${API_BASE}/cards?page=${page}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error('Failed to fetch cards')
  return res.json()
}

export async function getAllCards(): Promise<{ cards: Card[]; total: number }> {
  const res = await fetch(`${API_BASE}/cards/all`)
  if (!res.ok) throw new Error('Failed to fetch all cards')
  return res.json()
}

export async function addCard(card: Omit<Card, 'id'>): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card)
  })
  if (!res.ok) throw new Error('Failed to add card')
  return res.json()
}

export async function recordBattle(data: BattleRequest): Promise<BattleResponse> {
  const res = await fetch(`${API_BASE}/battle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to record battle')
  return res.json()
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}
