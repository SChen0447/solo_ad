import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { Artist, Performance, Work, SearchResult } from '../types';

interface AppState {
  artists: Artist[];
  performances: Performance[];
  loading: boolean;
  searchResults: SearchResult[];
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ARTISTS'; payload: Artist[] }
  | { type: 'ADD_ARTIST'; payload: Artist }
  | { type: 'UPDATE_ARTIST'; payload: Artist }
  | { type: 'DELETE_ARTIST'; payload: string }
  | { type: 'ADD_WORK'; payload: { artistId: string; work: Work } }
  | { type: 'UPDATE_WORK'; payload: { artistId: string; work: Work } }
  | { type: 'DELETE_WORK'; payload: { artistId: string; workId: string } }
  | { type: 'SET_PERFORMANCES'; payload: Performance[] }
  | { type: 'ADD_PERFORMANCE'; payload: Performance }
  | { type: 'UPDATE_PERFORMANCE'; payload: Performance }
  | { type: 'DELETE_PERFORMANCE'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: SearchResult[] };

const initialState: AppState = {
  artists: [],
  performances: [],
  loading: true,
  searchResults: [],
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ARTISTS':
      return { ...state, artists: action.payload };
    case 'ADD_ARTIST':
      return { ...state, artists: [...state.artists, action.payload] };
    case 'UPDATE_ARTIST':
      return {
        ...state,
        artists: state.artists.map(a =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_ARTIST':
      return {
        ...state,
        artists: state.artists.filter(a => a.id !== action.payload),
      };
    case 'ADD_WORK':
      return {
        ...state,
        artists: state.artists.map(a =>
          a.id === action.payload.artistId
            ? { ...a, works: [...a.works, action.payload.work] }
            : a
        ),
      };
    case 'UPDATE_WORK':
      return {
        ...state,
        artists: state.artists.map(a =>
          a.id === action.payload.artistId
            ? {
                ...a,
                works: a.works.map(w =>
                  w.id === action.payload.work.id ? action.payload.work : w
                ),
              }
            : a
        ),
      };
    case 'DELETE_WORK':
      return {
        ...state,
        artists: state.artists.map(a =>
          a.id === action.payload.artistId
            ? { ...a, works: a.works.filter(w => w.id !== action.payload.workId) }
            : a
        ),
      };
    case 'SET_PERFORMANCES':
      return { ...state, performances: action.payload };
    case 'ADD_PERFORMANCE':
      return { ...state, performances: [...state.performances, action.payload] };
    case 'UPDATE_PERFORMANCE':
      return {
        ...state,
        performances: state.performances.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_PERFORMANCE':
      return {
        ...state,
        performances: state.performances.filter(p => p.id !== action.payload),
      };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  fetchArtists: () => Promise<void>;
  fetchPerformances: () => Promise<void>;
  addArtist: (data: Omit<Artist, 'id' | 'works'>) => Promise<Artist>;
  updateArtist: (id: string, data: Partial<Artist>) => Promise<void>;
  deleteArtist: (id: string) => Promise<void>;
  addWork: (artistId: string, data: Omit<Work, 'id' | 'artistId'>) => Promise<Work>;
  updateWork: (artistId: string, workId: string, data: Partial<Work>) => Promise<void>;
  deleteWork: (artistId: string, workId: string) => Promise<void>;
  addPerformance: (data: Omit<Performance, 'id'>) => Promise<Performance>;
  updatePerformance: (id: string, data: Partial<Performance>) => Promise<void>;
  deletePerformance: (id: string) => Promise<void>;
  search: (query: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const fetchArtists = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch('/api/artists');
      const data = await res.json();
      dispatch({ type: 'SET_ARTISTS', payload: data });
    } catch (err) {
      console.error('Failed to fetch artists:', err);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const fetchPerformances = useCallback(async () => {
    try {
      const res = await fetch('/api/performances');
      const data = await res.json();
      dispatch({ type: 'SET_PERFORMANCES', payload: data });
    } catch (err) {
      console.error('Failed to fetch performances:', err);
    }
  }, []);

  const addArtist = useCallback(async (data: Omit<Artist, 'id' | 'works'>): Promise<Artist> => {
    const res = await fetch('/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const artist = await res.json();
    dispatch({ type: 'ADD_ARTIST', payload: artist });
    return artist;
  }, []);

  const updateArtist = useCallback(async (id: string, data: Partial<Artist>) => {
    const res = await fetch(`/api/artists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const artist = await res.json();
    dispatch({ type: 'UPDATE_ARTIST', payload: artist });
  }, []);

  const deleteArtist = useCallback(async (id: string) => {
    await fetch(`/api/artists/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_ARTIST', payload: id });
  }, []);

  const addWork = useCallback(async (artistId: string, data: Omit<Work, 'id' | 'artistId'>): Promise<Work> => {
    const res = await fetch(`/api/artists/${artistId}/works`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const work = await res.json();
    dispatch({ type: 'ADD_WORK', payload: { artistId, work } });
    return work;
  }, []);

  const updateWork = useCallback(async (artistId: string, workId: string, data: Partial<Work>) => {
    const res = await fetch(`/api/artists/${artistId}/works/${workId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const work = await res.json();
    dispatch({ type: 'UPDATE_WORK', payload: { artistId, work } });
  }, []);

  const deleteWork = useCallback(async (artistId: string, workId: string) => {
    await fetch(`/api/artists/${artistId}/works/${workId}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_WORK', payload: { artistId, workId } });
  }, []);

  const addPerformance = useCallback(async (data: Omit<Performance, 'id'>): Promise<Performance> => {
    const res = await fetch('/api/performances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const perf = await res.json();
    dispatch({ type: 'ADD_PERFORMANCE', payload: perf });
    return perf;
  }, []);

  const updatePerformance = useCallback(async (id: string, data: Partial<Performance>) => {
    const res = await fetch(`/api/performances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const perf = await res.json();
    dispatch({ type: 'UPDATE_PERFORMANCE', payload: perf });
  }, []);

  const deletePerformance = useCallback(async (id: string) => {
    await fetch(`/api/performances/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_PERFORMANCE', payload: id });
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: data });
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchArtists();
    fetchPerformances();
  }, [fetchArtists, fetchPerformances]);

  return (
    <AppContext.Provider
      value={{
        state,
        fetchArtists,
        fetchPerformances,
        addArtist,
        updateArtist,
        deleteArtist,
        addWork,
        updateWork,
        deleteWork,
        addPerformance,
        updatePerformance,
        deletePerformance,
        search,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
