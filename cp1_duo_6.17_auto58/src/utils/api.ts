import axios from 'axios';
import type { Song, PlaylistState } from './socket';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export async function getPlaylist(): Promise<PlaylistState> {
  const response = await api.get<PlaylistState>('/playlist');
  return response.data;
}

export async function addSong(url: string): Promise<Song> {
  const response = await api.post<Song>('/songs', { url });
  return response.data;
}

export async function voteSong(songId: string): Promise<{ success: boolean; votes: number }> {
  const response = await api.post<{ success: boolean; votes: number }>(`/songs/${songId}/vote`);
  return response.data;
}

export function validateMusicUrl(url: string): boolean {
  const spotifyPattern = /^https?:\/\/(open\.spotify\.com|spotify\.com)\/(track|playlist|album)\/.+/i;
  const neteasePattern = /^https?:\/\/(music\.)?163\.com\/(#\/)?song\?id=\d+/i;
  return spotifyPattern.test(url) || neteasePattern.test(url);
}
