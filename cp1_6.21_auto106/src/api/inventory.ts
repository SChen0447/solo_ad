import type { InventoryItem, Recipe, Category } from '../../shared/types'

const API_BASE = '/api'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`)
  }
  return res.json()
}

export const inventoryApi = {
  getAll: (): Promise<InventoryItem[]> =>
    fetch(`${API_BASE}/inventory`).then(handleResponse),

  create: (data: Omit<InventoryItem, 'id' | 'handled'>): Promise<InventoryItem> =>
    fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  update: (id: string, data: Partial<InventoryItem>): Promise<InventoryItem> =>
    fetch(`${API_BASE}/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  remove: (id: string): Promise<{ success: boolean }> =>
    fetch(`${API_BASE}/inventory/${id}`, {
      method: 'DELETE',
    }).then(handleResponse),

  handle: (id: string): Promise<InventoryItem> =>
    fetch(`${API_BASE}/inventory/${id}/handle`, {
      method: 'PUT',
    }).then(handleResponse),
}

export const recipeApi = {
  getAll: (): Promise<Recipe[]> =>
    fetch(`${API_BASE}/recipes`).then(handleResponse),

  recommend: (): Promise<Recipe[]> =>
    fetch(`${API_BASE}/recipes/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(handleResponse),
}

export type { InventoryItem, Recipe, Category }
