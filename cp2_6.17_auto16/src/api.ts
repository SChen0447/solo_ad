import type { Project, CanvasElement, OnlineUser } from './types';

const API_BASE = '/api';

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`);
  return res.json();
}

export async function createProject(name: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function getElements(projectId: string): Promise<CanvasElement[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/elements`);
  return res.json();
}

export async function getElementsSince(
  projectId: string,
  since: number
): Promise<{ elements: CanvasElement[]; deleted: string[] }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/elements?since=${since}`);
  return res.json();
}

export async function addElement(
  projectId: string,
  element: Omit<CanvasElement, 'id' | 'updatedAt'>
): Promise<CanvasElement> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/elements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(element),
  });
  return res.json();
}

export async function updateElement(
  projectId: string,
  elementId: string,
  updates: Partial<CanvasElement>
): Promise<CanvasElement> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/elements/${elementId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteElement(
  projectId: string,
  elementId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/elements/${elementId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function joinProject(
  projectId: string,
  nickname: string
): Promise<{ userId: string; color: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  return res.json();
}

export async function leaveProject(
  projectId: string,
  userId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/users/${userId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function getOnlineUsers(projectId: string): Promise<OnlineUser[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/users`);
  return res.json();
}

export async function updateUserCursor(
  projectId: string,
  userId: string,
  x: number,
  y: number
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y }),
  });
  return res.json();
}
