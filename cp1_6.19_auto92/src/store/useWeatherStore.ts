import { create } from 'zustand';
import { WeatherState } from '../modules/weather/types';
import { weatherManager } from '../modules/weather/weatherManager';

interface WeatherStore {
  weatherState: WeatherState;
  init: () => void;
}

export const useWeatherStore = create<WeatherStore>((set) => ({
  weatherState: weatherManager.getState(),
  init: () => {
    weatherManager.subscribe((state) => {
      set({ weatherState: state });
    });
  },
}));
