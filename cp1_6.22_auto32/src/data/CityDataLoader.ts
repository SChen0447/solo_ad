import type { CityData } from '../types/DataTypes';

export async function loadCityData(): Promise<CityData[]> {
  const response = await fetch('/data/cities.json');
  if (!response.ok) {
    throw new Error(`Failed to load city data: ${response.statusText}`);
  }
  const data: CityData[] = await response.json();
  return data;
}
