import { Activity, UserPreference, Recommendation, ConflictInfo, PaginatedResponse } from '../types';

const API_BASE = '/api';

export async function getActivities(params: {
  date?: string;
  type?: string;
  difficulty?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedResponse<Activity>> {
  const query = new URLSearchParams();
  if (params.date) query.set('date', params.date);
  if (params.type) query.set('type', params.type);
  if (params.difficulty) query.set('difficulty', params.difficulty);
  if (params.page) query.set('page', params.page.toString());
  if (params.pageSize) query.set('pageSize', params.pageSize.toString());
  
  const res = await fetch(`${API_BASE}/activities?${query}`);
  return res.json();
}

export async function getActivity(id: string): Promise<Activity> {
  const res = await fetch(`${API_BASE}/activities/${id}`);
  return res.json();
}

export async function getUserPreference(userId: string): Promise<UserPreference> {
  const res = await fetch(`${API_BASE}/preferences/${userId}`);
  return res.json();
}

export async function updateUserPreference(userId: string, data: Partial<UserPreference>): Promise<UserPreference> {
  const res = await fetch(`${API_BASE}/preferences/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function getBookedActivities(userId: string): Promise<Activity[]> {
  const res = await fetch(`${API_BASE}/preferences/${userId}/booked`);
  return res.json();
}

export async function bookActivity(userId: string, activityId: string): Promise<{
  success: boolean;
  conflicts?: ConflictInfo[];
  bookedActivityIds?: string[];
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/preferences/${userId}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId })
  });
  return res.json();
}

export async function unbookActivity(userId: string, activityId: string): Promise<{
  success: boolean;
  bookedActivityIds: string[];
}> {
  const res = await fetch(`${API_BASE}/preferences/${userId}/unbook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId })
  });
  return res.json();
}

export async function analyzePreferences(userId: string): Promise<{
  topTags: string[];
  recommendations: Recommendation[];
  totalBooked: number;
}> {
  const res = await fetch(`${API_BASE}/preferences/${userId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function checkConflict(userId: string, activityId: string): Promise<{
  hasConflict: boolean;
  conflicts: ConflictInfo[];
}> {
  const res = await fetch(`${API_BASE}/preferences/check-conflict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, activityId })
  });
  return res.json();
}
