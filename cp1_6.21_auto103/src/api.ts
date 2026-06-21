import { Project, TimeLog } from './types';

const API_BASE = '/api';

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProject(data: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function fetchTimeLogs(): Promise<TimeLog[]> {
  const res = await fetch(`${API_BASE}/time-logs`);
  if (!res.ok) throw new Error('Failed to fetch time logs');
  return res.json();
}

export async function createTimeLog(data: Omit<TimeLog, 'id' | 'createdAt'>): Promise<TimeLog> {
  const res = await fetch(`${API_BASE}/time-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create time log');
  return res.json();
}

export async function deleteTimeLog(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/time-logs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete time log');
}
