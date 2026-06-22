import type {
  User,
  Group,
  GroupDetail,
  CheckIn,
  CheckInResponse,
  Challenge,
  UserChallenge,
  ChallengeStats,
} from './types';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getCurrentUser: () => req<User>('/users/me'),
  getUser: (id: string) => req<User>(`/users/${id}`),

  fetchGroups: () => req<Group[]>('/groups'),
  createGroup: (data: { name: string; goal: string; leaderId: string }) =>
    req<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
  fetchGroup: (id: string) => req<GroupDetail>(`/groups/${id}`),
  joinGroup: (groupId: string, userId: string) =>
    req<Group>(`/groups/${groupId}/join`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  fetchCheckIns: (groupId: string) => req<CheckIn[]>(`/checkins/group/${groupId}`),
  postCheckIn: (data: { userId: string; groupId: string; text: string; imageUrl?: string }) =>
    req<CheckInResponse>('/checkins', { method: 'POST', body: JSON.stringify(data) }),
  fetchUserCheckIns: (userId: string) => req<CheckIn[]>(`/users/${userId}/checkins`),

  fetchChallenges: (groupId: string) => req<Challenge[]>(`/challenges/group/${groupId}`),
  createChallenge: (data: {
    groupId: string;
    leaderId: string;
    title: string;
    description: string;
    targetCount: number;
    durationDays: number;
  }) =>
    req<Challenge>('/challenges', { method: 'POST', body: JSON.stringify(data) }),
  joinChallenge: (challengeId: string, userId: string) =>
    req<{ challenge: Challenge; user: User }>(`/challenges/${challengeId}/join`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  updateProgress: (challengeId: string, userId: string, delta: number) =>
    req<Challenge>(`/challenges/${challengeId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ userId, delta }),
    }),
  completeChallenge: (challengeId: string) =>
    req<{ challenge: Challenge }>(`/challenges/${challengeId}/complete`, {
      method: 'POST',
    }),
  fetchUserChallenges: (userId: string) =>
    req<{ challenges: UserChallenge[]; stats: ChallengeStats }>(`/users/${userId}/challenges`),
};
