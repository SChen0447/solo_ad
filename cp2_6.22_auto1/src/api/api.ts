import type {
  Podcast,
  Episode,
  ListeningProgress,
  GeneratePlaylistRequest,
  GeneratePlaylistResponse
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  getPodcasts(search?: string): Promise<Podcast[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<Podcast[]>(`/podcasts${query}`);
  },

  getEpisodes(podcastId: string): Promise<Episode[]> {
    return request<Episode[]>(`/podcasts/${podcastId}/episodes`);
  },

  subscribePodcast(podcastId: string, subscribe: boolean): Promise<Podcast> {
    return request<Podcast>('/podcasts/subscribe', {
      method: 'POST',
      body: JSON.stringify({ podcastId, subscribe })
    });
  },

  generatePlaylist(req: GeneratePlaylistRequest): Promise<GeneratePlaylistResponse> {
    return request<GeneratePlaylistResponse>('/playlist/generate', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  },

  updateProgress(
    episodeId: string,
    position: number,
    status: ListeningProgress['status']
  ): Promise<ListeningProgress> {
    return request<ListeningProgress>('/progress', {
      method: 'PUT',
      body: JSON.stringify({ episodeId, position, status })
    });
  },

  getAllProgress(): Promise<ListeningProgress[]> {
    return request<ListeningProgress[]>('/progress');
  }
};

const PROGRESS_STORAGE_KEY = 'podcast_listening_progress';

export function saveProgressToLocal(progress: ListeningProgress[]): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

export function loadProgressFromLocal(): ListeningProgress[] {
  try {
    const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load progress:', e);
    return [];
  }
}

export function saveSingleProgressLocal(episodeId: string, position: number, status: ListeningProgress['status']): void {
  const all = loadProgressFromLocal();
  const existing = all.findIndex((p) => p.episodeId === episodeId);
  const newProgress: ListeningProgress = {
    episodeId,
    position,
    status,
    updatedAt: new Date().toISOString()
  };
  if (existing >= 0) {
    all[existing] = newProgress;
  } else {
    all.push(newProgress);
  }
  saveProgressToLocal(all);
}

export function getSingleProgressLocal(episodeId: string): ListeningProgress | undefined {
  const all = loadProgressFromLocal();
  return all.find((p) => p.episodeId === episodeId);
}
