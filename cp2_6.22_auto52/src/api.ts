import type {
  Room,
  Order,
  MenuItem,
  Guest,
  Bill,
  Branch,
} from './types';

const API_BASE = '/api';

const getHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }
  return response.json();
};

export const authApi = {
  login: async (username: string, password: string): Promise<{ token: string; username: string }> => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  register: async (username: string, password: string): Promise<{ token: string; username: string }> => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },
};

export const roomsApi = {
  getRooms: async (branch: Branch): Promise<Room[]> => {
    const response = await fetch(`${API_BASE}/rooms?branch=${branch}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getRoom: async (id: string): Promise<Room> => {
    const response = await fetch(`${API_BASE}/rooms/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  checkIn: async (
    id: string,
    guest: Guest,
    days: number,
    deposit: number
  ): Promise<{ room: Room; order: Order; operator: string }> => {
    const response = await fetch(`${API_BASE}/rooms/${id}/checkin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ guest, days, deposit }),
    });
    return handleResponse(response);
  },

  checkOut: async (id: string, paymentMethod: 'cash' | 'wechat' | 'alipay'): Promise<{ room: Room; order: Order }> => {
    const response = await fetch(`${API_BASE}/rooms/${id}/checkout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ paymentMethod }),
    });
    return handleResponse(response);
  },

  updateStatus: async (id: string, status: 'vacant' | 'cleaning' | 'maintenance'): Promise<Room> => {
    const response = await fetch(`${API_BASE}/rooms/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },
};

export const ordersApi = {
  getOrders: async (branch?: Branch, status?: 'active' | 'settled'): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (branch) params.append('branch', branch);
    if (status) params.append('status', status);
    const response = await fetch(`${API_BASE}/orders?${params}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await fetch(`${API_BASE}/orders/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getOrderByRoom: async (roomId: string): Promise<Order> => {
    const response = await fetch(`${API_BASE}/orders/room/${roomId}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  addConsumption: async (
    id: string,
    menuItemId: string,
    quantity: number = 1
  ): Promise<{ order: Order; consumption: any }> => {
    const response = await fetch(`${API_BASE}/orders/${id}/consumption`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ menuItemId, quantity }),
    });
    return handleResponse(response);
  },

  getMenuItems: async (): Promise<MenuItem[]> => {
    const response = await fetch(`${API_BASE}/menu`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  calculateBill: async (id: string): Promise<Bill> => {
    const response = await fetch(`${API_BASE}/orders/${id}/bill`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};
