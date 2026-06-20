import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Artist, Track, Show, SearchResult, AppContextType } from '../types';

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

const BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [styleColors, setStyleColors] = useState<Record<string, string>>({});

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s, tags] = await Promise.all([
        fetchJson<Artist[]>(`${BASE}/artists`),
        fetchJson<Show[]>(`${BASE}/shows`),
        fetchJson<{ tags: string[]; colors: Record<string, string> }>(`${BASE}/style-tags`),
      ]);
      setArtists(a);
      setShows(s);
      setStyleColors(tags.colors);
      const allTracks = await Promise.all(
        a.map(art => fetchJson<Track[]>(`${BASE}/artists/${art.id}/tracks`))
      );
      setTracks(allTracks.flat());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addArtist = useCallback(async (data: Omit<Artist, 'id'>) => {
    const artist = await fetchJson<Artist>(`${BASE}/artists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setArtists(prev => [...prev, artist]);
    return artist;
  }, []);

  const addTrack = useCallback(async (data: Omit<Track, 'id'>) => {
    const track = await fetchJson<Track>(`${BASE}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setTracks(prev => [...prev, track]);
    return track;
  }, []);

  const updateTrack = useCallback(async (id: string, data: Partial<Track>) => {
    const track = await fetchJson<Track>(`${BASE}/tracks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setTracks(prev => prev.map(t => (t.id === id ? track : t)));
    return track;
  }, []);

  const addShow = useCallback(async (data: Omit<Show, 'id'>) => {
    const show = await fetchJson<Show>(`${BASE}/shows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setShows(prev => [...prev, show]);
    return show;
  }, []);

  const updateShow = useCallback(async (id: string, data: Partial<Show>) => {
    const show = await fetchJson<Show>(`${BASE}/shows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setShows(prev => prev.map(s => (s.id === id ? show : s)));
    return show;
  }, []);

  const deleteShow = useCallback(async (id: string) => {
    await fetchJson<{ success: boolean }>(`${BASE}/shows/${id}`, { method: 'DELETE' });
    setShows(prev => prev.filter(s => s.id !== id));
  }, []);

  const search = useCallback(async (q: string): Promise<SearchResult[]> => {
    const res = await fetchJson<{ results: SearchResult[] }>(`${BASE}/search?q=${encodeURIComponent(q)}`);
    return res.results;
  }, []);

  const value = useMemo<AppContextType>(() => ({
    artists, tracks, shows, loading, styleColors,
    fetchAllData, addArtist, addTrack, addShow, updateShow, updateTrack, deleteShow, search,
  }), [artists, tracks, shows, loading, styleColors, fetchAllData, addArtist, addTrack, addShow, updateShow, updateTrack, deleteShow, search]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
