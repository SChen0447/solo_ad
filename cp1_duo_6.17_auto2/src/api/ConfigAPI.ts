import type { BodyConfig } from '../core/AstroBody';

const API_BASE_URL = 'http://localhost:5000/api';

export interface SavedConfig {
  bodies: BodyConfig[];
  timestamp?: number;
}

export class ConfigAPI {
  static async saveConfig(bodies: BodyConfig[]): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bodies,
          timestamp: Date.now(),
        } as SavedConfig),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      return data.id;
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  static async loadConfig(id: string): Promise<SavedConfig> {
    try {
      const response = await fetch(`${API_BASE_URL}/load/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('配置ID不存在');
        }
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      return data as SavedConfig;
    } catch (error) {
      console.error('Failed to load config:', error);
      throw error;
    }
  }
}
