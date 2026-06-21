import type { TrackParams, TrackType } from './track-generator';

export interface SavedTrack {
  id: string;
  trackType: TrackType;
  config: TrackParams;
  createdAt: string;
}

export async function saveTrack(config: TrackParams, trackType: TrackType): Promise<SavedTrack> {
  const response = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, trackType })
  });
  if (!response.ok) {
    throw new Error('Failed to save track');
  }
  return response.json();
}

export async function loadTracks(): Promise<SavedTrack[]> {
  const response = await fetch('/api/load');
  if (!response.ok) {
    throw new Error('Failed to load tracks');
  }
  return response.json();
}

export async function loadTrackById(id: string): Promise<SavedTrack> {
  const response = await fetch(`/api/load/${id}`);
  if (!response.ok) {
    throw new Error('Track not found');
  }
  return response.json();
}
