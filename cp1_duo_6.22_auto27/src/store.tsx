import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { Trip, DayPlan, Spot, DiaryEntry, Photo } from './types';

interface AppState {
  trips: Trip[];
  currentTripId: string | null;
  currentDayId: string | null;
  currentDiaryId: string | null;
  diaries: DiaryEntry[];
  albumPhotos: Photo[];
  loading: boolean;
  activeTab: 'plan' | 'diary' | 'album';
}

type Action =
  | { type: 'SET_TRIPS'; payload: Trip[] }
  | { type: 'SET_CURRENT_TRIP'; payload: string | null }
  | { type: 'SET_CURRENT_DAY'; payload: string | null }
  | { type: 'SET_CURRENT_DIARY'; payload: string | null }
  | { type: 'SET_DIARIES'; payload: DiaryEntry[] }
  | { type: 'SET_ALBUM_PHOTOS'; payload: Photo[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: 'plan' | 'diary' | 'album' }
  | { type: 'ADD_TRIP'; payload: Trip }
  | { type: 'UPDATE_TRIP'; payload: Trip }
  | { type: 'DELETE_TRIP'; payload: string }
  | { type: 'ADD_DIARY'; payload: DiaryEntry }
  | { type: 'UPDATE_DIARY'; payload: DiaryEntry }
  | { type: 'DELETE_DIARY'; payload: string };

const initialState: AppState = {
  trips: [],
  currentTripId: null,
  currentDayId: null,
  currentDiaryId: null,
  diaries: [],
  albumPhotos: [],
  loading: false,
  activeTab: 'plan',
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TRIPS':
      return { ...state, trips: action.payload };
    case 'SET_CURRENT_TRIP':
      return { ...state, currentTripId: action.payload };
    case 'SET_CURRENT_DAY':
      return { ...state, currentDayId: action.payload };
    case 'SET_CURRENT_DIARY':
      return { ...state, currentDiaryId: action.payload };
    case 'SET_DIARIES':
      return { ...state, diaries: action.payload };
    case 'SET_ALBUM_PHOTOS':
      return { ...state, albumPhotos: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'ADD_TRIP':
      return { ...state, trips: [...state.trips, action.payload] };
    case 'UPDATE_TRIP':
      return {
        ...state,
        trips: state.trips.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };
    case 'DELETE_TRIP':
      return {
        ...state,
        trips: state.trips.filter((t) => t.id !== action.payload),
        currentTripId: state.currentTripId === action.payload ? null : state.currentTripId,
      };
    case 'ADD_DIARY':
      return { ...state, diaries: [action.payload, ...state.diaries] };
    case 'UPDATE_DIARY':
      return {
        ...state,
        diaries: state.diaries.map((d) => (d.id === action.payload.id ? action.payload : d)),
      };
    case 'DELETE_DIARY':
      return {
        ...state,
        diaries: state.diaries.filter((d) => d.id !== action.payload),
        currentDiaryId: state.currentDiaryId === action.payload ? null : state.currentDiaryId,
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  fetchTrips: () => Promise<void>;
  createTrip: (name: string) => Promise<Trip>;
  deleteTrip: (id: string) => Promise<void>;
  addDay: (tripId: string, date?: string) => Promise<DayPlan>;
  addSpot: (tripId: string, dayId: string, spot: Partial<Spot>) => Promise<Spot>;
  updateSpot: (spotId: string, spot: Partial<Spot>) => Promise<Spot>;
  deleteSpot: (spotId: string) => Promise<void>;
  reorderSpots: (tripId: string, dayId: string, spotIds: string[]) => Promise<void>;
  fetchDiaries: (tripId: string) => Promise<void>;
  createDiary: (tripId: string, data: Partial<DiaryEntry>) => Promise<DiaryEntry>;
  updateDiary: (id: string, data: Partial<DiaryEntry>) => Promise<DiaryEntry>;
  deleteDiary: (id: string) => Promise<void>;
  fetchAlbum: (tripId: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  calculateDistance: (tripId: string) => Promise<void>;
  setCurrentTrip: (id: string | null) => void;
  setCurrentDay: (id: string | null) => void;
  setCurrentDiary: (id: string | null) => void;
  setActiveTab: (tab: 'plan' | 'diary' | 'album') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchTrips = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch('/api/trips');
      const data = await res.json();
      dispatch({ type: 'SET_TRIPS', payload: data });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createTrip = useCallback(async (name: string) => {
    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const trip = await res.json();
    dispatch({ type: 'ADD_TRIP', payload: trip });
    dispatch({ type: 'SET_CURRENT_TRIP', payload: trip.id });
    return trip;
  }, []);

  const deleteTrip = useCallback(async (id: string) => {
    await fetch(`/api/trips/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_TRIP', payload: id });
  }, []);

  const addDay = useCallback(async (tripId: string, date?: string) => {
    const res = await fetch(`/api/trips/${tripId}/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    const day = await res.json();
    const trip = state.trips.find((t) => t.id === tripId);
    if (trip) {
      const updated = { ...trip, days: [...trip.days, day] };
      dispatch({ type: 'UPDATE_TRIP', payload: updated });
    }
    return day;
  }, [state.trips]);

  const addSpot = useCallback(
    async (tripId: string, dayId: string, spot: Partial<Spot>) => {
      const res = await fetch(`/api/trips/${tripId}/days/${dayId}/spots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spot),
      });
      const newSpot = await res.json();
      const trip = state.trips.find((t) => t.id === tripId);
      if (trip) {
        const updated = {
          ...trip,
          days: trip.days.map((d) =>
            d.id === dayId ? { ...d, spots: [...d.spots, newSpot] } : d
          ),
        };
        dispatch({ type: 'UPDATE_TRIP', payload: updated });
      }
      return newSpot;
    },
    [state.trips]
  );

  const updateSpot = useCallback(
    async (spotId: string, spot: Partial<Spot>) => {
      const res = await fetch(`/api/spots/${spotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spot),
      });
      const updated = await res.json();
      for (const trip of state.trips) {
        for (const day of trip.days) {
          if (day.spots.some((s) => s.id === spotId)) {
            const newTrip = {
              ...trip,
              days: trip.days.map((d) =>
                d.id === day.id
                  ? { ...d, spots: d.spots.map((s) => (s.id === spotId ? updated : s)) }
                  : d
              ),
            };
            dispatch({ type: 'UPDATE_TRIP', payload: newTrip });
            break;
          }
        }
      }
      return updated;
    },
    [state.trips]
  );

  const deleteSpot = useCallback(
    async (spotId: string) => {
      await fetch(`/api/spots/${spotId}`, { method: 'DELETE' });
      for (const trip of state.trips) {
        for (const day of trip.days) {
          if (day.spots.some((s) => s.id === spotId)) {
            const newTrip = {
              ...trip,
              days: trip.days.map((d) =>
                d.id === day.id
                  ? { ...d, spots: d.spots.filter((s) => s.id !== spotId) }
                  : d
              ),
            };
            dispatch({ type: 'UPDATE_TRIP', payload: newTrip });
            break;
          }
        }
      }
    },
    [state.trips]
  );

  const reorderSpots = useCallback(
    async (tripId: string, dayId: string, spotIds: string[]) => {
      await fetch(`/api/trips/${tripId}/days/${dayId}/spots/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotIds }),
      });
      const trip = state.trips.find((t) => t.id === tripId);
      if (trip) {
        const day = trip.days.find((d) => d.id === dayId);
        if (day) {
          const reordered = spotIds
            .map((id, index) => {
              const spot = day.spots.find((s) => s.id === id);
              return spot ? { ...spot, order: index } : null;
            })
            .filter(Boolean) as Spot[];
          const updated = {
            ...trip,
            days: trip.days.map((d) => (d.id === dayId ? { ...d, spots: reordered } : d)),
          };
          dispatch({ type: 'UPDATE_TRIP', payload: updated });
        }
      }
    },
    [state.trips]
  );

  const fetchDiaries = useCallback(async (tripId: string) => {
    const res = await fetch(`/api/trips/${tripId}/diaries`);
    const data = await res.json();
    dispatch({ type: 'SET_DIARIES', payload: data });
  }, []);

  const createDiary = useCallback(
    async (tripId: string, data: Partial<DiaryEntry>) => {
      const res = await fetch(`/api/trips/${tripId}/diaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const entry = await res.json();
      dispatch({ type: 'ADD_DIARY', payload: entry });
      dispatch({ type: 'SET_CURRENT_DIARY', payload: entry.id });
      return entry;
    },
    []
  );

  const updateDiary = useCallback(async (id: string, data: Partial<DiaryEntry>) => {
    const res = await fetch(`/api/diaries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const entry = await res.json();
    dispatch({ type: 'UPDATE_DIARY', payload: entry });
    return entry;
  }, []);

  const deleteDiary = useCallback(async (id: string) => {
    await fetch(`/api/diaries/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_DIARY', payload: id });
  }, []);

  const fetchAlbum = useCallback(async (tripId: string) => {
    const res = await fetch(`/api/trips/${tripId}/album`);
    const data = await res.json();
    dispatch({ type: 'SET_ALBUM_PHOTOS', payload: data });
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: base64,
            mimeType: file.type,
          }),
        });
        const data = await res.json();
        resolve(data.url);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const calculateDistance = useCallback(async (tripId: string) => {
    await fetch(`/api/trips/${tripId}/calculate-distance`, { method: 'POST' });
  }, []);

  const setCurrentTrip = useCallback((id: string | null) => {
    dispatch({ type: 'SET_CURRENT_TRIP', payload: id });
    dispatch({ type: 'SET_CURRENT_DAY', payload: null });
    dispatch({ type: 'SET_CURRENT_DIARY', payload: null });
  }, []);

  const setCurrentDay = useCallback((id: string | null) => {
    dispatch({ type: 'SET_CURRENT_DAY', payload: id });
  }, []);

  const setCurrentDiary = useCallback((id: string | null) => {
    dispatch({ type: 'SET_CURRENT_DIARY', payload: id });
  }, []);

  const setActiveTab = useCallback((tab: 'plan' | 'diary' | 'album') => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  }, []);

  const value: AppContextType = {
    state,
    fetchTrips,
    createTrip,
    deleteTrip,
    addDay,
    addSpot,
    updateSpot,
    deleteSpot,
    reorderSpots,
    fetchDiaries,
    createDiary,
    updateDiary,
    deleteDiary,
    fetchAlbum,
    uploadImage,
    calculateDistance,
    setCurrentTrip,
    setCurrentDay,
    setCurrentDiary,
    setActiveTab,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppProvider');
  }
  return context;
}
