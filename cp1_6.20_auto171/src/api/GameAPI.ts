import axios from 'axios';
import type { UnitType, GameRecord } from '../types';

const API_BASE = '/api';

export const GameAPI = {
  async getUnits(): Promise<UnitType[]> {
    try {
      const response = await axios.get(`${API_BASE}/units`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch units:', error);
      return [];
    }
  },

  async getUnit(unitType: string): Promise<UnitType | null> {
    try {
      const response = await axios.get(`${API_BASE}/units/${unitType}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch unit:', error);
      return null;
    }
  },

  async saveGame(data: {
    winner: string;
    turns: number;
    player_units_remaining: number;
    ai_units_remaining: number;
    duration: number;
  }): Promise<GameRecord | null> {
    try {
      const response = await axios.post(`${API_BASE}/games`, data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to save game:', error);
      return null;
    }
  },

  async getGames(): Promise<GameRecord[]> {
    try {
      const response = await axios.get(`${API_BASE}/games`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch games:', error);
      return [];
    }
  },

  async getGame(gameId: string): Promise<GameRecord | null> {
    try {
      const response = await axios.get(`${API_BASE}/games/${gameId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch game:', error);
      return null;
    }
  },
};
