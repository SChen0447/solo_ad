export interface Episode {
  id: string;
  title: string;
  pubDate: string;
  duration: number;
  summary: string;
  coverUrl: string;
  rating: number;
  podcastTitle?: string;
  podcastId?: string;
}

export interface Podcast {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  episodes?: Episode[];
  lastUpdated: string;
  isSubscribed: boolean;
}

export interface ProgressEntry {
  currentTime: number;
  duration: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface PlaylistResult {
  playlist: Episode[];
  totalDuration: number;
  episodeCount: number;
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getPodcasts(
  search?: string,
  page = 1,
  limit = 20
): Promise<{ podcasts: Podcast[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('page', String(page));
  params.set('limit', String(limit));

  return request<{ podcasts: Podcast[]; total: number; page: number; limit: number }>(
    `/podcasts?${params.toString()}`
  );
}

export async function getSubscribedPodcasts(): Promise<{ podcasts: Podcast[] }> {
  return request<{ podcasts: Podcast[] }>('/podcasts/subscribed');
}

export async function getPodcastById(id: string): Promise<Podcast> {
  return request<Podcast>(`/podcasts/${id}`);
}

export async function getEpisodes(podcastId: string): Promise<{ episodes: Episode[] }> {
  return request<{ episodes: Episode[] }>(`/podcasts/${podcastId}/episodes`);
}

export async function subscribePodcast(podcastId: string): Promise<{ success: boolean; podcast: Podcast }> {
  return request<{ success: boolean; podcast: Podcast }>('/podcasts/subscribe', {
    method: 'POST',
    body: JSON.stringify({ podcastId }),
  });
}

export async function unsubscribePodcast(podcastId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/podcasts/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ podcastId }),
  });
}

export async function generatePlaylist(
  maxDurationMinutes: number,
  includeCompleted = false
): Promise<PlaylistResult> {
  return request<PlaylistResult>('/playlist/generate', {
    method: 'POST',
    body: JSON.stringify({ maxDuration: maxDurationMinutes, includeCompleted }),
  });
}

export async function getProgress(): Promise<{ progress: Record<string, ProgressEntry> }> {
  return request<{ progress: Record<string, ProgressEntry> }>('/progress');
}

export async function updateProgress(
  episodeId: string,
  currentTime: number,
  duration: number
): Promise<{ success: boolean; progress: ProgressEntry }> {
  return request<{ success: boolean; progress: ProgressEntry }>('/progress', {
    method: 'PUT',
    body: JSON.stringify({ episodeId, currentTime, duration }),
  });
}

const PROGRESS_STORAGE_KEY = 'podcast_progress_local';

export function saveProgressToLocal(episodeId: string, currentTime: number, duration: number): void {
  const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
  const progress: Record<string, ProgressEntry> = stored ? JSON.parse(stored) : {};

  let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
  if (currentTime <= 0) {
    status = 'not_started';
  } else if (currentTime >= duration * 0.95) {
    status = 'completed';
  } else {
    status = 'in_progress';
  }

  progress[episodeId] = {
    currentTime,
    duration,
    status,
  };

  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function getProgressFromLocal(): Record<string, ProgressEntry> {
  const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function getEpisodeProgress(episodeId: string): ProgressEntry | null {
  const all = getProgressFromLocal();
  return all[episodeId] || null;
}
