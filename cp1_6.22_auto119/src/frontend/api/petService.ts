import { Pet, PetWithDetails, VaccineRecord, VaccineType, Reminder, WeightRecord } from '../types';

const API_BASE = '/api';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const petService = {
  getAllPets: async (): Promise<PetWithDetails[]> => {
    const response = await fetch(`${API_BASE}/pets`);
    return handleResponse<PetWithDetails[]>(response);
  },

  getPetById: async (id: string): Promise<PetWithDetails> => {
    const response = await fetch(`${API_BASE}/pets/${id}`);
    return handleResponse<PetWithDetails>(response);
  },

  createPet: async (petData: Omit<Pet, 'id' | 'vaccines' | 'weights'>): Promise<Pet> => {
    const response = await fetch(`${API_BASE}/pets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(petData),
    });
    return handleResponse<Pet>(response);
  },

  updatePet: async (id: string, updates: Partial<Omit<Pet, 'id' | 'vaccines' | 'weights'>>): Promise<Pet> => {
    const response = await fetch(`${API_BASE}/pets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<Pet>(response);
  },

  deletePet: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/pets/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(response);
  },

  addVaccine: async (petId: string, vaccineData: Omit<VaccineRecord, 'id' | 'nextDate'>): Promise<PetWithDetails> => {
    const response = await fetch(`${API_BASE}/pets/${petId}/vaccines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vaccineData),
    });
    return handleResponse<PetWithDetails>(response);
  },

  addWeight: async (petId: string, weightData: Omit<WeightRecord, 'id'>): Promise<Pet> => {
    const response = await fetch(`${API_BASE}/pets/${petId}/weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weightData),
    });
    return handleResponse<Pet>(response);
  },

  getVaccineTypes: async (): Promise<VaccineType[]> => {
    const response = await fetch(`${API_BASE}/vaccine-types`);
    return handleResponse<VaccineType[]>(response);
  },

  getReminders: async (): Promise<Reminder[]> => {
    const response = await fetch(`${API_BASE}/reminders`);
    return handleResponse<Reminder[]>(response);
  },
};
