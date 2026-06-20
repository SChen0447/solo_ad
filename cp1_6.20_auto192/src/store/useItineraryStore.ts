import { create } from 'zustand';
import type { City, DayAttraction, DayPlan, Itinerary } from '../types';

const MAX_DAYS = 7;
const MAX_ATTRACTIONS_PER_DAY = 4;

interface ItineraryState {
  selectedCity: City | null;
  tripName: string;
  days: DayPlan[];
  currentDay: number;
  setSelectedCity: (city: City) => void;
  setTripName: (name: string) => void;
  addAttraction: (dayIndex: number, attraction: DayAttraction) => void;
  removeAttraction: (dayIndex: number, attractionId: string) => void;
  reorderAttractions: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  updateAttractionNote: (dayIndex: number, attractionId: string, note: string) => void;
  setCurrentDay: (day: number) => void;
  addDay: () => void;
  removeDay: (dayIndex: number) => void;
  resetItinerary: () => void;
  loadItinerary: (itinerary: Itinerary) => void;
}

export const useItineraryStore = create<ItineraryState>((set) => ({
  selectedCity: null,
  tripName: '',
  days: [{ dayIndex: 0, attractions: [] }],
  currentDay: 0,

  setSelectedCity: (city) => set({ selectedCity: city }),

  setTripName: (name) => set({ tripName: name }),

  addAttraction: (dayIndex, attraction) =>
    set((state) => {
      const day = state.days[dayIndex];
      if (!day || day.attractions.length >= MAX_ATTRACTIONS_PER_DAY) return state;
      const newDays = state.days.map((d, i) =>
        i === dayIndex
          ? { ...d, attractions: [...d.attractions, attraction] }
          : d
      );
      return { days: newDays };
    }),

  removeAttraction: (dayIndex, attractionId) =>
    set((state) => ({
      days: state.days.map((d, i) =>
        i === dayIndex
          ? { ...d, attractions: d.attractions.filter((a) => a.id !== attractionId) }
          : d
      ),
    })),

  reorderAttractions: (dayIndex, fromIndex, toIndex) =>
    set((state) => {
      const day = state.days[dayIndex];
      if (!day) return state;
      const attractions = [...day.attractions];
      const [moved] = attractions.splice(fromIndex, 1);
      attractions.splice(toIndex, 0, moved);
      const newDays = state.days.map((d, i) =>
        i === dayIndex ? { ...d, attractions } : d
      );
      return { days: newDays };
    }),

  updateAttractionNote: (dayIndex, attractionId, note) =>
    set((state) => ({
      days: state.days.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              attractions: d.attractions.map((a) =>
                a.id === attractionId ? { ...a, note } : a
              ),
            }
          : d
      ),
    })),

  setCurrentDay: (day) => set({ currentDay: day }),

  addDay: () =>
    set((state) => {
      if (state.days.length >= MAX_DAYS) return state;
      const newDayIndex = state.days.length;
      return {
        days: [...state.days, { dayIndex: newDayIndex, attractions: [] }],
        currentDay: newDayIndex,
      };
    }),

  removeDay: (dayIndex) =>
    set((state) => {
      if (state.days.length <= 1) return state;
      const newDays = state.days
        .filter((_, i) => i !== dayIndex)
        .map((d, i) => ({ ...d, dayIndex: i }));
      const newCurrentDay = Math.min(state.currentDay, newDays.length - 1);
      return { days: newDays, currentDay: newCurrentDay };
    }),

  resetItinerary: () =>
    set({
      selectedCity: null,
      tripName: '',
      days: [{ dayIndex: 0, attractions: [] }],
      currentDay: 0,
    }),

  loadItinerary: (itinerary) =>
    set({
      selectedCity: null,
      tripName: itinerary.tripName,
      days: itinerary.days,
      currentDay: 0,
    }),
}));
