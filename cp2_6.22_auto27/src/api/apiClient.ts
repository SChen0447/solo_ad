export interface Track {
  id: string;
  name: string;
  artist: string;
  duration: string;
  note: string;
  order: number;
}

export interface VoteResult {
  trackId: string;
  trackName: string;
  count: number;
  percentage: number;
}

export interface VoteSession {
  id: string;
  title: string;
  candidates: { trackId: string; trackName: string }[];
  results: VoteResult[];
  totalVotes: number;
  active: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  total: number;
  available: number;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

export const apiClient = {
  playlist: {
    getAll: () => request<Track[]>('/api/playlist'),
    add: (data: Omit<Track, 'id' | 'order'>) =>
      request<Track[]>('/api/playlist', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<Track[]>(`/api/playlist/${id}`, { method: 'DELETE' }),
    reorder: (orderedIds: string[]) =>
      request<Track[]>('/api/playlist/reorder', { method: 'PUT', body: JSON.stringify({ orderedIds }) }),
  },
  vote: {
    getCurrent: () => request<VoteSession | null>('/api/vote/current'),
    start: (title: string, candidateIds: string[]) =>
      request<VoteSession>('/api/vote/start', { method: 'POST', body: JSON.stringify({ title, candidateIds }) }),
    cast: (voterId: string, trackId: string) =>
      request<VoteSession>('/api/vote/cast', { method: 'POST', body: JSON.stringify({ voterId, trackId }) }),
    end: () =>
      request<VoteSession>('/api/vote/end', { method: 'POST' }),
  },
  equipment: {
    getAll: () => request<Equipment[]>('/api/equipment'),
    borrow: (id: string) =>
      request<Equipment[]>(`/api/equipment/${id}/borrow`, { method: 'POST' }),
    returnItem: (id: string) =>
      request<Equipment[]>(`/api/equipment/${id}/return`, { method: 'POST' }),
  },
};
