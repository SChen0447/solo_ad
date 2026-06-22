const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export interface Song {
  id: string;
  name: string;
  artist: string;
  duration: number;
  note: string;
}

export interface VoteCandidate {
  id: string;
  name: string;
  votes: number;
}

export interface VoteSession {
  active: boolean;
  topic?: string;
  candidates?: VoteCandidate[];
  totalVotes?: number;
}

export interface Equipment {
  id: string;
  name: string;
  total: number;
  available: number;
}

export const playlistApi = {
  getPlaylist: (): Promise<Song[]> => request<Song[]>('/playlist'),

  addSong: (song: Omit<Song, 'id'>): Promise<Song> =>
    request<Song>('/playlist', {
      method: 'POST',
      body: JSON.stringify(song),
    }),

  deleteSong: (id: string): Promise<Song> =>
    request<Song>(`/playlist/${id}`, {
      method: 'DELETE',
    }),

  reorderSongs: (newOrder: Song[]): Promise<Song[]> =>
    request<Song[]>('/playlist/reorder', {
      method: 'PUT',
      body: JSON.stringify({ newOrder }),
    }),
};

export const voteApi = {
  getVoteStatus: (): Promise<VoteSession> => request<VoteSession>('/vote'),

  startVote: (topic: string, candidateIds: string[]): Promise<VoteSession> =>
    request<VoteSession>('/vote/start', {
      method: 'POST',
      body: JSON.stringify({ topic, candidateIds }),
    }),

  castVote: (candidateId: string, voterId: string): Promise<{ success: boolean; voterId: string; candidateId: string; newVoteCount: number }> =>
    request(`/vote/${candidateId}`, {
      method: 'POST',
      headers: {
        'x-voter-id': voterId,
      },
    }),

  endVote: (): Promise<{ ended: boolean }> =>
    request('/vote/end', {
      method: 'POST',
    }),
};

export const equipmentApi = {
  getEquipmentList: (): Promise<Equipment[]> => request<Equipment[]>('/equipment'),

  borrowEquipment: (id: string): Promise<Equipment> =>
    request<Equipment>(`/equipment/${id}/borrow`, {
      method: 'POST',
    }),

  returnEquipment: (id: string): Promise<Equipment> =>
    request<Equipment>(`/equipment/${id}/return`, {
      method: 'POST',
    }),
};

export default {
  playlist: playlistApi,
  vote: voteApi,
  equipment: equipmentApi,
};
