import type { BrewRecord, FlavorEval } from './types';

const BASE_URL = '/api';

export const api = {
  async getRecords(): Promise<BrewRecord[]> {
    const res = await fetch(`${BASE_URL}/records`);
    return res.json();
  },

  async createRecord(
    data: Omit<BrewRecord, 'id' | 'recordNumber' | 'createdAt'>
  ): Promise<BrewRecord> {
    const res = await fetch(`${BASE_URL}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateRecord(
    id: string,
    data: Partial<BrewRecord>
  ): Promise<BrewRecord> {
    const res = await fetch(`${BASE_URL}/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async evaluateRecord(
    id: string,
    flavorEval: FlavorEval
  ): Promise<BrewRecord> {
    return this.updateRecord(id, { flavorEval });
  },

  async deleteRecord(id: string): Promise<void> {
    await fetch(`${BASE_URL}/records/${id}`, {
      method: 'DELETE',
    });
  },
};
