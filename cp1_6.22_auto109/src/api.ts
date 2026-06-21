export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: '流行' | '摇滚' | '古典';
  ratings: number[];
  coverColor: string;
  averageRating: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songIds: string[];
  coverColor: string;
  songCount?: number;
  totalDuration?: number;
}

export interface PlaylistDetail extends Playlist {
  songs: Song[];
  averageRating: number;
}

export interface Comment {
  id: string;
  songId: string;
  username: string;
  content: string;
  timestamp: number;
  avatarColor: string;
}

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const api = {
  getSongs: () => request<Song[]>('/songs'),
  getSong: (id: string) => request<Song>(`/songs/${id}`),
  createSong: (data: any) => request<Song>('/songs', { method: 'POST', body: JSON.stringify(data) }),
  rateSong: (id: string, rating: number) =>
    request<Song>(`/songs/${id}/rate`, { method: 'POST', body: JSON.stringify({ rating }) }),
  searchSongs: (q: string) => request<Song[]>(`/songs/search?q=${encodeURIComponent(q)}`),

  getPlaylists: () => request<Playlist[]>('/playlists'),
  getPlaylist: (id: string) => request<PlaylistDetail>(`/playlists/${id}`),
  createPlaylist: (data: { name: string; description: string; songIds: string[] }) =>
    request<Playlist>('/playlists', { method: 'POST', body: JSON.stringify(data) }),
  reorderPlaylist: (id: string, songIds: string[]) =>
    request<Playlist>(`/playlists/${id}/reorder`, { method: 'PUT', body: JSON.stringify({ songIds }) }),
  deletePlaylist: (id: string) =>
    request<{ success: boolean }>(`/playlists/${id}`, { method: 'DELETE' }),

  getComments: (songId: string) => request<Comment[]>(`/comments/${songId}`),
  addComment: (data: { songId: string; username: string; content: string }) =>
    request<Comment>('/comments', { method: 'POST', body: JSON.stringify(data) }),
};
