import {
  User,
  Activity,
  Registration,
  ServiceRecord,
  RankUser,
  CheckInResponse,
} from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

export const userApi = {
  register: (data: {
    nickname: string;
    email: string;
    password: string;
    skills: string[];
    availableTime: string;
  }) => request<User>('/users/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  login: (email: string, password: string) => request<User>('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),

  getProfile: (id: string) => request<User>(`/users/${id}`),

  getRegistrations: (id: string) => request<Registration[]>(`/users/${id}/registrations`),

  getServiceRecords: (id: string) => request<ServiceRecord[]>(`/users/${id}/service-records`),

  getRanking: () => request<RankUser[]>('/users/ranking/list'),

  updateProfile: (id: string, data: Partial<User>) => request<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

export const activityApi = {
  getAll: () => request<Activity[]>('/activities'),

  getById: (id: string) => request<Activity>(`/activities/${id}`),

  create: (data: {
    name: string;
    location: string;
    dateTime: string;
    maxVolunteers: number;
    description: string;
    skillsRequired: string[];
    createdBy: string;
  }) => request<Activity>('/activities', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getRegistrations: (id: string) => request<Registration[]>(`/activities/${id}/registrations`),

  register: (activityId: string, userId: string) => request<Registration>(`/activities/${activityId}/register`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),

  checkIn: (activityId: string, userId: string) => request<CheckInResponse>(`/activities/${activityId}/checkin`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),

  update: (id: string, data: Partial<Activity>) => request<Activity>(`/activities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => request<{ success: boolean }>(`/activities/${id}`, {
    method: 'DELETE',
  }),
};
