import axios from 'axios'
import type { Album, Song, Comment, PlaysTrendItem, TopSongItem, Summary, User } from '@/shared/types'

const api = axios.create({
  baseURL: '/api',
})

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ success: boolean; user: User }>('/login', { username, password }),
}

export const albumApi = {
  getAll: () => api.get<Album[]>('/albums'),
  create: (formData: FormData) => api.post<Album>('/albums', formData),
  update: (id: string, formData: FormData) => api.put<Album>(`/albums/${id}`, formData),
  delete: (id: string) => api.delete(`/albums/${id}`),
}

export const songApi = {
  getByAlbum: (albumId: string) => api.get<Song[]>(`/albums/${albumId}/songs`),
  getAll: () => api.get<Song[]>('/songs'),
  getById: (songId: string) => api.get<Song & { album: Album }>(`/songs/${songId}`),
  create: (albumId: string, formData: FormData) => api.post<Song>(`/albums/${albumId}/songs`, formData),
  update: (id: string, formData: FormData) => api.put<Song>(`/songs/${id}`, formData),
  delete: (id: string) => api.delete(`/songs/${id}`),
}

export const commentApi = {
  getBySong: (songId: string) => api.get<Comment[]>(`/songs/${songId}/comments`),
  create: (songId: string, nickname: string, content: string) =>
    api.post<Comment>(`/songs/${songId}/comments`, { nickname, content }),
}

export const likeApi = {
  toggle: (songId: string, sessionId: string) =>
    api.post<{ liked: boolean; likeCount: number }>(`/songs/${songId}/like`, {}, { headers: { 'x-session-id': sessionId } }),
  getStatus: (songId: string, sessionId: string) =>
    api.get<{ liked: boolean; likeCount: number }>(`/songs/${songId}/like-status`, { headers: { 'x-session-id': sessionId } }),
}

export const playApi = {
  record: (songId: string) => api.post<{ playCount: number }>(`/songs/${songId}/play`),
}

export const statsApi = {
  getPlaysTrend: () => api.get<PlaysTrendItem[]>('/stats/plays-trend'),
  getTopSongs: () => api.get<TopSongItem[]>('/stats/top-songs'),
  getSummary: () => api.get<Summary>('/stats/summary'),
}
