import { Medicine, Reminder, Member, ReminderStatus, Stats } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const medicinesApi = {
  getAll: () => request<Medicine[]>('/medicines'),
  getById: (id: string) => request<Medicine>(`/medicines/${id}`),
  create: (data: Partial<Medicine> & { createdBy: string }) =>
    request<Medicine>('/medicines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Medicine>) =>
    request<Medicine>(`/medicines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ message: string; medicine: Medicine }>(`/medicines/${id}`, {
      method: 'DELETE',
    }),
};

export const remindersApi = {
  getAll: () => request<Reminder[]>('/reminders'),
  create: (data: Partial<Reminder>) =>
    request<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: ReminderStatus) =>
    request<Reminder>(`/reminders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/reminders/${id}`, {
      method: 'DELETE',
    }),
  checkExpiry: () =>
    request<{
      totalPending: number;
      expiredCount: number;
      nearExpiryCount: number;
      reminders: Reminder[];
    }>('/reminders/check-expiry', {
      method: 'POST',
    }),
};

export const membersApi = {
  getAll: () => request<Member[]>('/members'),
  create: (name: string) =>
    request<Member>('/members', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  delete: (id: string) =>
    request<{ message: string; member: Member }>(`/members/${id}`, {
      method: 'DELETE',
    }),
};

export const statsApi = {
  get: () => request<Stats>('/stats'),
};
