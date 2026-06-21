import type { Annotation, Session } from '../types';

export async function createSession(name: string, imageData: string, createdBy: string): Promise<Session> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, imageData, createdBy }),
  });
  if (!response.ok) throw new Error('Failed to create session');
  return response.json();
}

export async function getSession(id: string): Promise<Session> {
  const response = await fetch(`/api/sessions/${id}`);
  if (!response.ok) throw new Error('Failed to get session');
  return response.json();
}

export async function getAnnotations(
  sessionId: string,
  filters?: { user?: string; type?: string }
): Promise<Annotation[]> {
  const params = new URLSearchParams();
  if (filters?.user) params.append('user', filters.user);
  if (filters?.type) params.append('type', filters.type);
  
  const url = `/api/sessions/${sessionId}/annotations${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to get annotations');
  return response.json();
}

export async function addAnnotation(annotation: Annotation): Promise<Annotation> {
  const response = await fetch('/api/annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(annotation),
  });
  if (!response.ok) throw new Error('Failed to add annotation');
  return response.json();
}

export async function updateAnnotation(id: string, annotation: Partial<Annotation>): Promise<Annotation> {
  const response = await fetch(`/api/annotations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(annotation),
  });
  if (!response.ok) throw new Error('Failed to update annotation');
  return response.json();
}

export async function deleteAnnotation(id: string): Promise<{ success: boolean; removed: number }> {
  const response = await fetch(`/api/annotations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete annotation');
  return response.json();
}

export async function deleteAnnotations(sessionId: string, ids: string[]): Promise<{ success: boolean; removed: number }> {
  const response = await fetch(`/api/sessions/${sessionId}/annotations`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('Failed to delete annotations');
  return response.json();
}
