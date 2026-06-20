import { User, Activity, RankingUser, Badge } from './types';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const getAuthHeaders = (): Record<string, string> => {
  const userId = localStorage.getItem('userId');
  return userId ? { 'x-user-id': userId } : {};
};

const request = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  return data as ApiResponse<T>;
};

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

  login: (data: { email: string; password: string }) =>
    request<User>('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: () => request<User>('/users/profile'),

  getRanking: () => request<RankingUser[]>('/users/ranking'),

  checkBadges: () => request<{ newBadges: Badge[]; totalHours: number; authLevel: number }>('/users/check-badges', {
    method: 'POST',
  }),
};

export const activityApi = {
  create: (data: {
    name: string;
    location: string;
    dateTime: string;
    maxParticipants: number;
    description: string;
    skillRequirements: string[];
  }) => request<Activity>('/activities', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getList: () => request<Activity[]>('/activities'),

  getDetail: (id: string) => request<Activity>(`/activities/${id}`),

  register: (id: string) => request<void>(`/activities/${id}/register`, {
    method: 'POST',
  }),

  checkin: (id: string) => request<{
    hours: number;
    totalHours: number;
    newBadges: Badge[];
    authLevel: number;
  }>(`/activities/${id}/checkin`, {
    method: 'POST',
  }),
};
