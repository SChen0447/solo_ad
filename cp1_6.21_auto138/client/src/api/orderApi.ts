import type {
  Order,
  CreateOrderData,
  Communication,
  CreateCommunicationData,
  OrderStatus,
} from '../types';

const API_BASE = '/api/orders';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const orderApi = {
  async getAll(): Promise<Order[]> {
    return request<Order[]>(API_BASE);
  },

  async getById(id: number): Promise<Order> {
    return request<Order>(`${API_BASE}/${id}`);
  },

  async create(data: CreateOrderData): Promise<Order> {
    return request<Order>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<CreateOrderData>): Promise<Order> {
    return request<Order>(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    return request<Order>(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async remove(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
  },

  async addCommunication(
    orderId: number,
    data: CreateCommunicationData
  ): Promise<Communication> {
    return request<Communication>(`${API_BASE}/${orderId}/communications`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCommunications(
    orderId: number,
    filters?: { start_date?: string; end_date?: string; keyword?: string }
  ): Promise<Communication[]> {
    const params = new URLSearchParams();
    if (filters?.start_date) params.set('start_date', filters.start_date);
    if (filters?.end_date) params.set('end_date', filters.end_date);
    if (filters?.keyword) params.set('keyword', filters.keyword);
    const qs = params.toString();
    return request<Communication[]>(
      `${API_BASE}/${orderId}/communications${qs ? `?${qs}` : ''}`
    );
  },
};
