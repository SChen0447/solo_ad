import type { Project, TechOption, Dimension } from '../types';

const BASE_URL = '/api';

interface ApiOptions extends RequestInit {
  showLoading?: boolean;
}

let loadingCount = 0;
const listeners: ((loading: boolean) => void)[] = [];

export const onLoadingChange = (fn: (loading: boolean) => void) => {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

const setLoading = (show: boolean) => {
  if (show) {
    loadingCount++;
  } else if (loadingCount > 0) {
    loadingCount--;
  }
  listeners.forEach((fn) => fn(loadingCount > 0));
};

const request = async <T>(url: string, options: ApiOptions = {}): Promise<T> => {
  const { showLoading = true, ...rest } = options;

  if (showLoading) setLoading(true);

  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...rest,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: '请求失败' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    if (showLoading) setLoading(false);
  }
};

export const api = {
  getDimensions: () => request<Dimension[]>('/dimensions'),

  createProject: (data: {
    name: string;
    description: string;
    options: Omit<TechOption, 'id'>[];
    createdBy?: string;
  }) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProjectList: () =>
    request<
      {
        id: string;
        shortCode: string;
        name: string;
        description: string;
        optionCount: number;
        voteCount: number;
        createdAt: string;
      }[]
    >('/projects/list'),

  getProject: (id: string) => request<Project>(`/projects/${id}`),

  updateProject: (id: string, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  submitVote: (projectId: string, optionId: string, vote: 'support' | 'oppose' | 'abstain') =>
    request<{ votes: Project['votes'] }>(`/projects/${projectId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ optionId, vote }),
    }),

  getShareLink: (projectId: string) =>
    request<{ shortCode: string; shareUrl: string }>(`/projects/${projectId}/share`),
};
