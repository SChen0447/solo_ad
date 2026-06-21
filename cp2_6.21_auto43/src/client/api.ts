import { Ingredient, Supplier, Order, HistoryEntry, OrderItem } from '../shared/types';

const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getInventory: () => request<Ingredient[]>('/inventory'),
  getInventoryById: (id: string) => request<Ingredient>(`/inventory/${id}`),
  createInventory: (data: Partial<Ingredient>) =>
    request<Ingredient>('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateInventory: (id: string, data: Partial<Ingredient>) =>
    request<Ingredient>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInventory: (id: string) =>
    request(`/inventory/${id}`, { method: 'DELETE' }),
  stockIn: (id: string, data: { quantity: number; expiryDate?: string; supplierId?: string }) =>
    request<Ingredient>(`/inventory/${id}/stock-in`, { method: 'POST', body: JSON.stringify(data) }),
  stockOut: (id: string, data: { quantity: number }) =>
    request<Ingredient>(`/inventory/${id}/stock-out`, { method: 'POST', body: JSON.stringify(data) }),
  waste: (id: string, data: { quantity: number }) =>
    request<Ingredient>(`/inventory/${id}/waste`, { method: 'POST', body: JSON.stringify(data) }),

  getSuppliers: () => request<Supplier[]>('/suppliers'),
  getSuppliersByIngredient: (ingredientId: string) =>
    request<Supplier[]>(`/suppliers/ingredient/${ingredientId}`),
  getSupplierById: (id: string) => request<Supplier>(`/suppliers/${id}`),
  createSupplier: (data: Partial<Supplier>) =>
    request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: Partial<Supplier>) =>
    request<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setPreferredSupplier: (id: string) =>
    request(`/suppliers/${id}/preferred`, { method: 'PUT' }),
  deleteSupplier: (id: string) =>
    request(`/suppliers/${id}`, { method: 'DELETE' }),
  addQuote: (id: string, data: { price: number; notes?: string }) =>
    request<Supplier>(`/suppliers/${id}/quote`, { method: 'POST', body: JSON.stringify(data) }),

  getOrders: () => request<Order[]>('/orders'),
  getOrderById: (id: string) => request<Order>(`/orders/${id}`),
  createOrder: (data: { items: OrderItem[] }) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id: string, data: Partial<Order>) =>
    request<Order>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getHistory: (ingredientId: string) =>
    request<HistoryEntry[]>(`/history/${ingredientId}`),

  getWarnings: () =>
    request<Array<{
      ingredientId: string;
      ingredientName: string;
      daysLeft: number;
      belowThreshold: boolean;
      expiringSoon: boolean;
      recommendedQuantity: number;
      unit: string;
    }>>('/warnings'),

  exportCSV: async () => {
    const res = await fetch(`${BASE}/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
