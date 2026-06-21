export interface Stall {
  id: string;
  label: string;
  status: 'available' | 'occupied' | 'checked-in' | 'blocked';
  vendorName?: string;
  vendorPhone?: string;
  vendorCategory?: string;
  checkInTime?: string;
}

export interface Fair {
  id: string;
  name: string;
  date: string;
  totalStalls: number;
  price: number;
  stalls: Stall[];
  createdAt: string;
}

export interface FairListItem {
  id: string;
  name: string;
  date: string;
  totalStalls: number;
  price: number;
  occupiedCount: number;
  checkedInCount: number;
  createdAt: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Network error');
  }
}

export function getFairs(): Promise<FairListItem[]> {
  return request<FairListItem[]>('/api/fairs');
}

export function createFair(data: { name: string; date: string; totalStalls: number; price: number }): Promise<Fair> {
  return request<Fair>('/api/fairs', { method: 'POST', body: JSON.stringify(data) });
}

export function getFairById(id: string): Promise<Fair> {
  return request<Fair>(`/api/fairs/${id}`);
}

export function registerStall(fairId: string, data: { stallId: string; vendorName: string; vendorPhone: string; vendorCategory: string }): Promise<{ stall: Stall; blockedIds: string[] }> {
  return request<{ stall: Stall; blockedIds: string[] }>(`/api/fairs/${fairId}/register`, { method: 'POST', body: JSON.stringify(data) });
}

export function checkInStall(fairId: string, stallId: string): Promise<{ stall: Stall; qrDataUrl: string }> {
  return request<{ stall: Stall; qrDataUrl: string }>(`/api/fairs/${fairId}/checkin`, { method: 'POST', body: JSON.stringify({ stallId }) });
}

export function getStallQRCode(fairId: string, stallId: string): Promise<{ qrDataUrl: string }> {
  return request<{ qrDataUrl: string }>(`/api/fairs/${fairId}/qrcode/${stallId}`);
}
