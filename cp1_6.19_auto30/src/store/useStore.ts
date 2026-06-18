import { create } from 'zustand';
import axios from 'axios';

export interface Track {
  id: string;
  name: string;
  artist: string;
  albumId?: string;
  duration: string;
  lyrics: string;
  coverUrl: string;
  audioUrl: string;
  isPublished: boolean;
  createdAt: string;
}

export interface Album {
  id: string;
  name: string;
  releaseDate: string;
  coverUrl: string;
  trackIds: string[];
  isPublished: boolean;
  createdAt: string;
  tracks?: Track[];
}

interface PlayerState {
  currentTrack: Track | null;
  playlist: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

interface StoreState {
  tracks: Track[];
  albums: Album[];
  publishedTracks: Track[];
  publishedAlbums: Album[];
  player: PlayerState;
  isLoading: boolean;
  sidebarOpen: boolean;
  isAuthenticated: boolean;
  fetchTracks: () => Promise<void>;
  fetchAlbums: () => Promise<void>;
  fetchPublishedContent: () => Promise<void>;
  addTrack: (data: FormData) => Promise<void>;
  updateTrack: (id: string, data: FormData) => Promise<void>;
  toggleTrackPublish: (id: string) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  addAlbum: (data: FormData) => Promise<void>;
  updateAlbum: (id: string, data: FormData) => Promise<void>;
  toggleAlbumPublish: (id: string) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  playTrack: (track: Track, playlist?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setSidebarOpen: (open: boolean) => void;
  login: () => void;
  logout: () => void;
}

const useStore = create<StoreState>((set, get) => ({
  tracks: [],
  albums: [],
  publishedTracks: [],
  publishedAlbums: [],
  player: {
    currentTrack: null,
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0
  },
  isLoading: false,
  sidebarOpen: true,
  isAuthenticated: false,

  fetchTracks: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get<Track[]>('/api/tracks');
      set({ tracks: response.data });
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAlbums: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get<Album[]>('/api/albums');
      set({ albums: response.data });
    } catch (error) {
      console.error('Error fetching albums:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPublishedContent: async () => {
    set({ isLoading: true });
    try {
      const [tracksRes, albumsRes] = await Promise.all([
        axios.get<Track[]>('/api/tracks/published'),
        axios.get<Album[]>('/api/albums/published')
      ]);
      set({ publishedTracks: tracksRes.data, publishedAlbums: albumsRes.data });
    } catch (error) {
      console.error('Error fetching published content:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addTrack: async (data: FormData) => {
    try {
      const response = await axios.post<Track>('/api/tracks', data);
      set((state) => ({ tracks: [response.data, ...state.tracks] }));
    } catch (error) {
      console.error('Error adding track:', error);
      throw error;
    }
  },

  updateTrack: async (id: string, data: FormData) => {
    try {
      const response = await axios.put<Track>(`/api/tracks/${id}`, data);
      set((state) => ({
        tracks: state.tracks.map((t) => (t.id === id ? response.data : t))
      }));
    } catch (error) {
      console.error('Error updating track:', error);
      throw error;
    }
  },

  toggleTrackPublish: async (id: string) => {
    const track = get().tracks.find((t) => t.id === id);
    if (!track) return;
    try {
      const response = await axios.patch<Track>(`/api/tracks/${id}/publish`, {
        isPublished: !track.isPublished
      });
      set((state) => ({
        tracks: state.tracks.map((t) => (t.id === id ? response.data : t))
      }));
    } catch (error) {
      console.error('Error toggling track publish:', error);
    }
  },

  deleteTrack: async (id: string) => {
    try {
      await axios.delete(`/api/tracks/${id}`);
      set((state) => ({
        tracks: state.tracks.filter((t) => t.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting track:', error);
    }
  },

  addAlbum: async (data: FormData) => {
    try {
      const response = await axios.post<Album>('/api/albums', data);
      set((state) => ({ albums: [response.data, ...state.albums] }));
    } catch (error) {
      console.error('Error adding album:', error);
      throw error;
    }
  },

  updateAlbum: async (id: string, data: FormData) => {
    try {
      const response = await axios.put<Album>(`/api/albums/${id}`, data);
      set((state) => ({
        albums: state.albums.map((a) => (a.id === id ? response.data : a))
      }));
    } catch (error) {
      console.error('Error updating album:', error);
      throw error;
    }
  },

  toggleAlbumPublish: async (id: string) => {
    const album = get().albums.find((a) => a.id === id);
    if (!album) return;
    try {
      const response = await axios.patch<Album>(`/api/albums/${id}/publish`, {
        isPublished: !album.isPublished
      });
      set((state) => ({
        albums: state.albums.map((a) => (a.id === id ? response.data : a))
      }));
    } catch (error) {
      console.error('Error toggling album publish:', error);
    }
  },

  deleteAlbum: async (id: string) => {
    try {
      await axios.delete(`/api/albums/${id}`);
      set((state) => ({
        albums: state.albums.filter((a) => a.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting album:', error);
    }
  },

  playTrack: (track: Track, playlist?: Track[]) => {
    const currentPlaylist = playlist || get().player.playlist;
    const currentIndex = currentPlaylist.findIndex((t) => t.id === track.id);
    set({
      player: {
        currentTrack: track,
        playlist: currentPlaylist.length > 0 ? currentPlaylist : [track],
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
        isPlaying: true,
        currentTime: 0,
        duration: 0
      }
    });
  },

  togglePlay: () => {
    set((state) => ({
      player: { ...state.player, isPlaying: !state.player.isPlaying }
    }));
  },

  nextTrack: () => {
    const { playlist, currentIndex } = get().player;
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    set({
      player: {
        ...get().player,
        currentTrack: playlist[nextIndex],
        currentIndex: nextIndex,
        currentTime: 0,
        isPlaying: true
      }
    });
  },

  prevTrack: () => {
    const { playlist, currentIndex } = get().player;
    if (playlist.length === 0) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    set({
      player: {
        ...get().player,
        currentTrack: playlist[prevIndex],
        currentIndex: prevIndex,
        currentTime: 0,
        isPlaying: true
      }
    });
  },

  setCurrentTime: (time: number) => {
    set((state) => ({
      player: { ...state.player, currentTime: time }
    }));
  },

  setDuration: (duration: number) => {
    set((state) => ({
      player: { ...state.player, duration }
    }));
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },

  login: () => {
    set({ isAuthenticated: true });
  },

  logout: () => {
    set({ isAuthenticated: false });
  }
}));

export default useStore;
