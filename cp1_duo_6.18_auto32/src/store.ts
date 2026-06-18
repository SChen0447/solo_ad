import { create } from 'zustand';
import type { TravelPoint, TravelStore } from './types/travel';

export const useTravelStore = create<TravelStore>((set) => ({
  travelData: [],
  selectedPoint: null,
  currentTime: 0,
  isPlaying: false,
  isGalleryOpen: false,

  setTravelData: (data: TravelPoint[]) => {
    if (data.length > 0) {
      const sortedData = [...data].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const earliestTime = new Date(sortedData[0].date).getTime();
      set({
        travelData: sortedData,
        currentTime: earliestTime,
        selectedPoint: null,
        isGalleryOpen: false,
        isPlaying: false,
      });
    } else {
      set({
        travelData: [],
        currentTime: 0,
        selectedPoint: null,
        isGalleryOpen: false,
        isPlaying: false,
      });
    }
  },

  selectPoint: (index: number | null) => set({ selectedPoint: index }),

  setCurrentTime: (time: number) => set({ currentTime: time }),

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  stopPlayback: () => set({ isPlaying: false }),

  toggleGallery: () => set((state) => ({ isGalleryOpen: !state.isGalleryOpen })),
}));
