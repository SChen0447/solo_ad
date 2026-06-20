export interface Volunteer {
  id: string;
  nickname: string;
  email: string;
  skills: string[];
  availableSlots: string[];
  avatar: string;
  totalHours: number;
  authLevel: number;
  registeredActivities: string[];
  servedActivities: ServedActivity[];
  badges: number[];
  isAdmin: boolean;
}

export interface ServedActivity {
  activityId: string;
  activityName: string;
  hours: number;
  date: string;
  checkedIn: boolean;
}

export interface Activity {
  id: string;
  name: string;
  location: string;
  dateTime: string;
  maxParticipants: number;
  description: string;
  skillsRequired: string[];
  status: 'recruiting' | 'upcoming' | 'ended';
  registeredUsers: string[];
  checkedInUsers: string[];
  registeredCount: number;
  registeredVolunteers?: { id: string; nickname: string; avatar: string }[];
  duration: number;
}

export interface RankingItem {
  rank: number;
  id: string;
  nickname: string;
  avatar: string;
  totalHours: number;
  skills: string[];
  authLevel: number;
  badges: number[];
}

const BASE_URL = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

export const api = {
  register: (data: {
    nickname: string;
    email: string;
    password: string;
    skills: string[];
    availableSlots: string[];
  }) => request<{ success: boolean; user: Volunteer }>('/users/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  login: (email: string, password: string) => request<{ success: boolean; user: Volunteer }>('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),

  getUser: (id: string) => request<Volunteer>(`/users/${id}`),

  getRanking: () => request<RankingItem[]>('/users/ranking/list'),

  updateUserActivity: (
    userId: string,
    data: {
      activityId: string;
      activityName?: string;
      hours?: number;
      date?: string;
      action: 'register' | 'checkin';
    }
  ) => request<{ success: boolean; user: Volunteer; newBadges: number[] }>(`/users/${userId}/activity`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  createActivity: (data: {
    name: string;
    location: string;
    dateTime: string;
    maxParticipants: number;
    description: string;
    skillsRequired: string[];
    duration?: number;
  }) => request<{ success: boolean; activity: Activity }>('/activities', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getActivities: () => request<Activity[]>('/activities'),

  getActivity: (id: string) => request<Activity>(`/activities/${id}`),

  registerActivity: (activityId: string, userId: string) => request<{
    success: boolean;
    registered: boolean;
    registeredCount: number;
  }>(`/activities/${activityId}/register`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),

  checkinActivity: (activityId: string, userId: string) => request<{
    success: boolean;
    checkedIn: boolean;
    duration: number;
    date: string;
    name: string;
  }>(`/activities/${activityId}/checkin`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),
};
