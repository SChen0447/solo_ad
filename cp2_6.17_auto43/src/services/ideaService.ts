import type { Idea, IdeaWithName, Group } from '../types';

const API_BASE = '/api';

export async function getIdeas(): Promise<Idea[]> {
  const response = await fetch(`${API_BASE}/ideas`);
  if (!response.ok) {
    throw new Error('Failed to fetch ideas');
  }
  return response.json();
}

export async function getAllIdeasWithNames(): Promise<IdeaWithName[]> {
  const response = await fetch(`${API_BASE}/ideas/all`);
  if (!response.ok) {
    throw new Error('Failed to fetch ideas with names');
  }
  return response.json();
}

export async function submitIdea(content: string, participantName: string): Promise<Idea> {
  const response = await fetch(`${API_BASE}/ideas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, participantName }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit idea');
  }
  return response.json();
}

export async function deleteIdea(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/ideas/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete idea');
  }
}

export async function clearAllIdeas(): Promise<void> {
  const response = await fetch(`${API_BASE}/ideas`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to clear ideas');
  }
}

export async function groupIdeas(groupSize: number): Promise<Group[]> {
  const response = await fetch(`${API_BASE}/ideas/group`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ groupSize }),
  });
  if (!response.ok) {
    throw new Error('Failed to group ideas');
  }
  return response.json();
}
