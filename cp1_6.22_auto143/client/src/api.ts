import {
  Part,
  PartCategory,
  PartSelection,
  CarStats,
  SavedSetup,
  Track,
  TrackMatchResult,
  Recommendation
} from './types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }
  return data.data as T;
}

export const api = {
  getParts: () => request<Record<PartCategory, Part[]>>('/garage/parts'),
  calculateStats: (selection: PartSelection) =>
    request<{ selection: PartSelection; stats: CarStats }>('/garage/calculate', {
      method: 'POST',
      body: JSON.stringify(selection)
    }),
  getCurrentSetup: () =>
    request<{ selection: PartSelection; stats: CarStats }>('/garage/current'),
  getSetups: () => request<SavedSetup[]>('/garage/setups'),
  saveSetup: (name: string, selection: PartSelection) =>
    request<SavedSetup>('/garage/setups', {
      method: 'POST',
      body: JSON.stringify({ name, selection })
    }),
  loadSetup: (id: string) => request<SavedSetup>(`/garage/setups/${id}`),
  deleteSetup: (id: string) =>
    request<void>(`/garage/setups/${id}`, { method: 'DELETE' }),
  getTracks: () => request<Track[]>('/track/list'),
  calculateTrack: (trackId: string, stats: CarStats) =>
    request<TrackMatchResult>('/track/calculate', {
      method: 'POST',
      body: JSON.stringify({ trackId, stats })
    }),
  getRecommendations: (trackId: string, setups: SavedSetup[]) =>
    request<Recommendation[]>('/strategy/recommend', {
      method: 'POST',
      body: JSON.stringify({ trackId, setups })
    })
};
