export type ShiftType = 'morning' | 'afternoon' | 'evening'

export interface Shift {
  id: string
  employeeId: string
  employeeName: string
  shiftType: ShiftType
  date: string
  note?: string
}

export interface Employee {
  id: string
  name: string
}

export interface Order {
  id: string
  customerName: string
  bouquetName: string
  purchaseDate: string
  quote: string
  isFavorite: boolean
}

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const shiftApi = {
  getAll: () => request<Shift[]>('/shifts'),
  create: (data: Omit<Shift, 'id'>) =>
    request<Shift>('/shifts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Omit<Shift, 'id'>) =>
    request<Shift>(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) =>
    request<void>(`/shifts/${id}`, { method: 'DELETE' })
}

export const orderApi = {
  getAll: () => request<Order[]>('/orders'),
  create: (data: Omit<Order, 'id' | 'quote' | 'isFavorite'> & { quote?: string }) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Order>) =>
    request<Order>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleFavorite: (id: string, isFavorite: boolean) =>
    request<Order>(`/orders/${id}/favorite`, {
      method: 'PATCH',
      body: JSON.stringify({ isFavorite })
    }),
  remove: (id: string) =>
    request<void>(`/orders/${id}`, { method: 'DELETE' })
}

export const employeeApi = {
  getAll: () => request<Employee[]>('/employees')
}

export const SHIFT_INFO: Record<ShiftType, { label: string; hours: string; color: string; bgColor: string }> = {
  morning: {
    label: '早班',
    hours: '09:00 - 12:00',
    color: '#FF8C69',
    bgColor: 'rgba(255, 140, 105, 0.85)'
  },
  afternoon: {
    label: '中班',
    hours: '12:00 - 15:00',
    color: '#6FA8DC',
    bgColor: 'rgba(111, 168, 220, 0.85)'
  },
  evening: {
    label: '晚班',
    hours: '15:00 - 18:00',
    color: '#9B59B6',
    bgColor: 'rgba(155, 89, 182, 0.85)'
  }
}
