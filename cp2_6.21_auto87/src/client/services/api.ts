import type { Task, Tool, Member, Harvest, WeeklyHarvest, TimePeriod, TaskType, TaskUrgency } from '@/types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || '请求失败');
  }
  return (await res.json()) as T;
}

export const api = {
  getTasks: () => request<Task[]>('/tasks'),
  createTask: (data: { title: string; type: TaskType; deadline: string; urgency: TaskUrgency }) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  claimTask: (taskId: string, memberId: string) =>
    request<Task>('/tasks/claim', { method: 'POST', body: JSON.stringify({ taskId, memberId }) }),
  completeTask: (taskId: string) =>
    request<Task>('/tasks/complete', { method: 'POST', body: JSON.stringify({ taskId }) }),

  getTools: () => request<Tool[]>('/tools'),
  reserveTool: (data: { toolId: string; date: string; period: TimePeriod; memberId: string; memberName: string }) =>
    request('/tools/reserve', { method: 'POST', body: JSON.stringify(data) }),

  getRankings: () => request<Member[]>('/members/rankings'),

  getHarvests: () => request<Harvest[]>('/harvests'),
  addHarvest: (data: { memberId: string; memberName: string; productName: string; weightG: number; quantity: number }) =>
    request<Harvest>('/harvests', { method: 'POST', body: JSON.stringify(data) }),
  getWeeklyHarvests: () => request<WeeklyHarvest[]>('/harvests/weekly'),
};
