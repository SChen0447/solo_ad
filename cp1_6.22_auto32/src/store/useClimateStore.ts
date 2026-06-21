import { create } from 'zustand';
import type { CompareMode, WeatherField, DetailCardInfo, CityData } from '../types/DataTypes';

interface ClimateState {
  cityData: CityData[];
  selectedCityIds: string[];
  compareMode: CompareMode;
  weatherField: WeatherField;
  currentMonth: number;
  detailCard: DetailCardInfo | null;
  isLoading: boolean;
  setCityData: (data: CityData[]) => void;
  setSelectedCityIds: (ids: string[]) => void;
  toggleCity: (cityId: string) => void;
  setCompareMode: (mode: CompareMode) => void;
  setWeatherField: (field: WeatherField) => void;
  setCurrentMonth: (month: number) => void;
  setDetailCard: (card: DetailCardInfo | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useClimateStore = create<ClimateState>((set, get) => ({
  cityData: [],
  selectedCityIds: ['beijing', 'shanghai'],
  compareMode: 'curve',
  weatherField: 'temperature',
  currentMonth: 1,
  detailCard: null,
  isLoading: true,

  setCityData: (data) => set({ cityData: data }),
  setSelectedCityIds: (ids) => set({ selectedCityIds: ids }),
  toggleCity: (cityId) => {
    const { selectedCityIds } = get();
    if (selectedCityIds.includes(cityId)) {
      if (selectedCityIds.length > 2) {
        set({ selectedCityIds: selectedCityIds.filter((id) => id !== cityId) });
      }
    } else {
      if (selectedCityIds.length < 4) {
        set({ selectedCityIds: [...selectedCityIds, cityId] });
      }
    }
  },
  setCompareMode: (mode) => set({ compareMode: mode }),
  setWeatherField: (field) => set({ weatherField: field }),
  setCurrentMonth: (month) => set({ currentMonth: month }),
  setDetailCard: (card) => set({ detailCard: card }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
