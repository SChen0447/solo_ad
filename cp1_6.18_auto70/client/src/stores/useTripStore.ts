import { create } from 'zustand';
import axios from 'axios';
import type { Trip, Activity, Conflict, POICategory } from '@/types';

interface TripState {
  trip: Trip | null;
  conflicts: Record<string, Conflict[]>;
  isChecking: boolean;
  selectedDayIndex: number;
  availableCities: string[];

  setTrip: (trip: Trip) => void;
  setSelectedDay: (index: number) => void;
  addActivity: (dayIndex: number, activity: Activity) => void;
  removeActivity: (dayIndex: number, activityId: string) => void;
  updateActivity: (dayIndex: number, activityId: string, updates: Partial<Activity>) => void;
  reorderActivities: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  setActivities: (dayIndex: number, activities: Activity[]) => void;
  checkConflicts: (dayIndex: number) => Promise<void>;
  generateItinerary: (params: {
    startDate: string;
    endDate: string;
    city: string;
    categories: POICategory[];
  }) => Promise<void>;
  loadCities: () => Promise<void>;
}

export const useTripStore = create<TripState>((set, get) => ({
  trip: null,
  conflicts: {},
  isChecking: false,
  selectedDayIndex: 0,
  availableCities: ['北京', '上海', '杭州', '成都', '西安'],

  setTrip: (trip) => set({ trip, selectedDayIndex: 0 }),

  setSelectedDay: (index) => set({ selectedDayIndex: index }),

  addActivity: (dayIndex, activity) => {
    set((state) => {
      if (!state.trip) return state;
      const newDays = [...state.trip.days];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        activities: [...newDays[dayIndex].activities, activity],
      };
      return { trip: { ...state.trip, days: newDays } };
    });
    get().checkConflicts(dayIndex);
  },

  removeActivity: (dayIndex, activityId) => {
    set((state) => {
      if (!state.trip) return state;
      const newDays = [...state.trip.days];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        activities: newDays[dayIndex].activities.filter((a) => a.id !== activityId),
      };
      return { trip: { ...state.trip, days: newDays } };
    });
    get().checkConflicts(dayIndex);
  },

  updateActivity: (dayIndex, activityId, updates) => {
    set((state) => {
      if (!state.trip) return state;
      const newDays = [...state.trip.days];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        activities: newDays[dayIndex].activities.map((a) =>
          a.id === activityId ? { ...a, ...updates } : a
        ),
      };
      return { trip: { ...state.trip, days: newDays } };
    });
  },

  reorderActivities: (dayIndex, fromIndex, toIndex) => {
    set((state) => {
      if (!state.trip) return state;
      const newDays = [...state.trip.days];
      const activities = [...newDays[dayIndex].activities];
      const [removed] = activities.splice(fromIndex, 1);
      activities.splice(toIndex, 0, removed);
      newDays[dayIndex] = { ...newDays[dayIndex], activities };
      return { trip: { ...state.trip, days: newDays } };
    });
  },

  setActivities: (dayIndex, activities) => {
    set((state) => {
      if (!state.trip) return state;
      const newDays = [...state.trip.days];
      newDays[dayIndex] = { ...newDays[dayIndex], activities };
      return { trip: { ...state.trip, days: newDays } };
    });
  },

  checkConflicts: async (dayIndex) => {
    const state = get();
    if (!state.trip) return;

    set({ isChecking: true });
    try {
      const activities = state.trip.days[dayIndex]?.activities || [];
      const { data } = await axios.post('/api/check-conflicts', { activities });
      set((s) => ({
        isChecking: false,
        conflicts: { ...s.conflicts, [dayIndex]: data.conflicts },
      }));
    } catch (error) {
      set({ isChecking: false });
    }
  },

  generateItinerary: async (params) => {
    try {
      const { data } = await axios.post('/api/generate-itinerary', params);

      const days = data.days.map((activities: Activity[], idx: number) => {
        const date = new Date(params.startDate);
        date.setDate(date.getDate() + idx);
        return {
          date: date.toISOString().split('T')[0],
          activities,
        };
      });

      const trip: Trip = {
        id: `trip_${Date.now()}`,
        name: `${params.city}之行`,
        startDate: params.startDate,
        endDate: params.endDate,
        city: params.city,
        categories: params.categories,
        days,
      };

      set({ trip, selectedDayIndex: 0, conflicts: {} });

      for (let i = 0; i < days.length; i++) {
        get().checkConflicts(i);
      }
    } catch (error) {
      console.error('Generate itinerary failed:', error);
    }
  },

  loadCities: async () => {
    try {
      const { data } = await axios.get('/api/cities');
      set({ availableCities: data });
    } catch (error) {
      console.error('Load cities failed:', error);
    }
  },
}));

export const selectTrip = (s: TripState) => s.trip;
export const selectDays = (s: TripState) => s.trip?.days || [];
export const selectCurrentDay = (s: TripState) =>
  s.trip?.days[s.selectedDayIndex];
export const selectCurrentActivities = (s: TripState) =>
  s.trip?.days[s.selectedDayIndex]?.activities || [];
export const selectCurrentConflicts = (s: TripState) =>
  s.conflicts[s.selectedDayIndex] || [];
export const selectIsChecking = (s: TripState) => s.isChecking;
export const selectSelectedDayIndex = (s: TripState) => s.selectedDayIndex;
export const selectAvailableCities = (s: TripState) => s.availableCities;
export const selectActions = (s: TripState) => ({
  setTrip: s.setTrip,
  setSelectedDay: s.setSelectedDay,
  addActivity: s.addActivity,
  removeActivity: s.removeActivity,
  updateActivity: s.updateActivity,
  reorderActivities: s.reorderActivities,
  setActivities: s.setActivities,
  checkConflicts: s.checkConflicts,
  generateItinerary: s.generateItinerary,
  loadCities: s.loadCities,
});
