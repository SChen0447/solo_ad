import type { Project, ProjectListItem, TechSolution, VoteResult } from '@/types';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

let loadingState = false;
const listeners: Set<(loading: boolean) => void> = new Set();

export function subscribeLoading(callback: (loading: boolean) => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setLoading(loading: boolean) {
  loadingState = loading;
  listeners.forEach(cb => cb(loading));
}

export function isLoading() {
  return loadingState;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  setLoading(true);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } finally {
    setLoading(false);
  }
}

export async function createProject(data: {
  name: string;
  description: string;
  createdBy: string;
  solutions: Omit<TechSolution, 'id'>[];
}): Promise<{ id: string; shortCode: string }> {
  return request<{ id: string; shortCode: string }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function getProjectsList(): Promise<ProjectListItem[]> {
  return request<ProjectListItem[]>('/api/projects/list');
}

export async function getProject(id: string): Promise<Project> {
  return request<Project>(`/api/projects/${id}`);
}

export async function getProjectByShortCode(shortCode: string): Promise<Project> {
  return request<Project>(`/api/share/${shortCode}`);
}

export async function submitVote(
  projectId: string,
  data: {
    solutionId: string;
    voteType: 'support' | 'oppose' | 'abstain';
    voterId: string;
  }
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/projects/${projectId}/votes`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function getVoteResults(projectId: string): Promise<VoteResult> {
  return request<VoteResult>(`/api/projects/${projectId}/votes`);
}

export async function updateScore(
  projectId: string,
  data: {
    solutionId: string;
    dimension: string;
    rating: number;
    description: string;
  }
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/projects/${projectId}/scores`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function getVoterId(): string {
  let voterId = localStorage.getItem('voterId');
  if (!voterId) {
    voterId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('voterId', voterId);
  }
  return voterId;
}

export type { ApiResponse };
