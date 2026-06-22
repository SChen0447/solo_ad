import type { Product, Order, StatsSummary, SalesTrendItem } from './types'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }))
    throw new Error(error.error || '请求失败')
  }
  return response.json()
}

export const productApi = {
  getAll: () => request<Product[]>('/products'),
  create: (data: Omit<Product, 'id' | 'createdAt'>) =>
    request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Omit<Product, 'id' | 'createdAt'>>) =>
    request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    }),
}

export const orderApi = {
  getAll: () => request<Order[]>('/orders'),
  create: (data: { productId: string; quantity: number }) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: Order['status']) =>
    request<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

export const statsApi = {
  getSummary: () => request<StatsSummary>('/stats/summary'),
  getSalesTrend: () => request<SalesTrendItem[]>('/stats/sales-trend'),
}
