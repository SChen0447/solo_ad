import type { Activity, VoteRecord, UserVoteHistory } from '../types';

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
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  getAllActivities: (): Promise<Activity[]> =>
    request<Activity[]>('/activities'),

  getActivity: (id: string): Promise<Activity> =>
    request<Activity>(`/activities/${id}`),

  createActivity: (data: {
    title: string;
    description: string;
    options: string[];
    deadline: number | null;
  }): Promise<Activity> =>
    request<Activity>('/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  vote: (activityId: string, optionId: string, userId: string): Promise<Activity> =>
    request<Activity>(`/activities/${activityId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId, userId }),
    }),

  unvote: (activityId: string, userId: string): Promise<Activity> =>
    request<Activity>(`/activities/${activityId}/vote`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),

  getUserVote: (activityId: string, userId: string): Promise<VoteRecord | null> =>
    request<VoteRecord | null>(`/activities/${activityId}/user-vote/${userId}`),

  getUserHistory: (userId: string): Promise<UserVoteHistory[]> =>
    request<UserVoteHistory[]>(`/user/${userId}/history`),
};
