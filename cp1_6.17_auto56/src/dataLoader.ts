import axios from 'axios';
import type { GridResponse, LayerResponse, LayerType } from './types';

export class DataLoader {
  private baseURL: string = '/api';

  async fetchGrid(): Promise<GridResponse> {
    try {
      const response = await axios.get<GridResponse>(`${this.baseURL}/grid`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch grid data:', error);
      throw error;
    }
  }

  async fetchLayer(layer: LayerType, radius: number = 40): Promise<LayerResponse> {
    try {
      const response = await axios.get<LayerResponse>(
        `${this.baseURL}/layer/${layer}`,
        { params: { radius } }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${layer} layer:`, error);
      throw error;
    }
  }

  async fetchAllLayers(radius: number = 40): Promise<Record<LayerType, LayerResponse>> {
    try {
      const [energy, traffic, green] = await Promise.all([
        this.fetchLayer('energy', radius),
        this.fetchLayer('traffic', radius),
        this.fetchLayer('green', radius)
      ]);
      return { energy, traffic, green };
    } catch (error) {
      console.error('Failed to fetch layers:', error);
      throw error;
    }
  }
}

export const dataLoader = new DataLoader();
