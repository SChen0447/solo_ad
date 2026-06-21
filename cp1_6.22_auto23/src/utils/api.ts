import type { Room, Resident, Reading, Bill, TrendData, SplitRule } from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function fetchRooms(): Promise<Room[]> {
  return request<Room[]>('/api/rooms');
}

export function fetchResidents(roomId?: string): Promise<Resident[]> {
  const params = new URLSearchParams();
  if (roomId) params.set('room_id', roomId);
  const query = params.toString();
  return request<Resident[]>(`/api/residents${query ? `?${query}` : ''}`);
}

export function createResident(data: Omit<Resident, 'id' | 'created_at'>): Promise<Resident> {
  return request<Resident>('/api/residents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateResident(id: string, data: Partial<Omit<Resident, 'id' | 'created_at'>>): Promise<Resident> {
  return request<Resident>(`/api/residents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteResident(id: string): Promise<void> {
  return request<void>(`/api/residents/${id}`, { method: 'DELETE' });
}

export function fetchReadings(roomId?: string, limit?: number): Promise<Reading[]> {
  const params = new URLSearchParams();
  if (roomId) params.set('room_id', roomId);
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return request<Reading[]>(`/api/readings${query ? `?${query}` : ''}`);
}

export function fetchLatestReading(roomId: string): Promise<Reading> {
  return request<Reading>(`/api/readings/latest?room_id=${encodeURIComponent(roomId)}`);
}

export function createReading(data: Omit<Reading, 'id' | 'delta_electricity' | 'delta_gas' | 'delta_water' | 'delta_heating'>): Promise<Reading> {
  return request<Reading>('/api/readings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteReading(id: string): Promise<void> {
  return request<void>(`/api/readings/${id}`, { method: 'DELETE' });
}

export function fetchBills(): Promise<Bill[]> {
  return request<Bill[]>('/api/bills');
}

export function fetchBillByMonth(month: string, roomId: string): Promise<Bill> {
  return request<Bill>(`/api/bills/${encodeURIComponent(month)}?room_id=${encodeURIComponent(roomId)}`);
}

export function calculateBill(data: { room_id: string; month: string; rule: SplitRule }): Promise<Bill> {
  return request<Bill>('/api/bills/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateSplit(id: string, data: { is_paid: boolean }): Promise<void> {
  return request<void>(`/api/bills/splits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function exportBill(month: string, roomId: string): Promise<void> {
  const res = await fetch(`/api/bills/export/${encodeURIComponent(month)}?room_id=${encodeURIComponent(roomId)}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Export failed');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const disposition = res.headers.get('Content-Disposition');
  const filename = disposition
    ? disposition.split('filename=')[1]?.replace(/"/g, '')
    : `bill-${month}.xlsx`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function fetchTrend(roomId: string): Promise<TrendData> {
  return request<TrendData>(`/api/bills/trend?room_id=${encodeURIComponent(roomId)}`);
}

export function createShareToken(billId: string): Promise<{ token: string }> {
  return request<{ token: string }>('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bill_id: billId }),
  });
}

export function fetchShareBill(token: string): Promise<Bill> {
  return request<Bill>(`/api/share/${encodeURIComponent(token)}`);
}
