export interface Idea {
  id: string;
  title: string;
  description: string;
  author: string;
  voteCount: number;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
}

export interface VoteResponse {
  idea: Idea;
  votesRemaining: number;
}

const BASE = '/api';

export async function createIdea(data: { title: string; description: string; author: string }): Promise<Idea> {
  const res = await fetch(`${BASE}/ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '创建失败');
  }
  return res.json();
}

export async function getIdeas(): Promise<Idea[]> {
  const res = await fetch(`${BASE}/ideas`);
  return res.json();
}

export async function voteIdea(id: string, userName: string): Promise<VoteResponse> {
  const res = await fetch(`${BASE}/ideas/${id}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '投票失败');
  }
  return res.json();
}

export async function getRankedIdeas(): Promise<Idea[]> {
  const res = await fetch(`${BASE}/ideas/ranked`);
  return res.json();
}

export async function updatePriority(id: string, priority: 'high' | 'medium' | 'low'): Promise<Idea> {
  const res = await fetch(`${BASE}/ideas/${id}/priority`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priority }),
  });
  return res.json();
}

export async function getUserVotes(userName: string): Promise<{ votesUsed: number; votesRemaining: number }> {
  const res = await fetch(`${BASE}/votes/${encodeURIComponent(userName)}`);
  return res.json();
}

export async function getUsers(): Promise<string[]> {
  const res = await fetch(`${BASE}/users`);
  return res.json();
}
