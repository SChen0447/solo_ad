import axios from 'axios';
import type { City, Attraction, Itinerary, ItinerarySummary, ShareLink, SaveItineraryRequest } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:5001/api',
});

export async function getCities(): Promise<City[]> {
  const res = await api.get<City[]>('/cities');
  return res.data;
}

export async function getAttractions(cityId: string, keyword?: string): Promise<Attraction[]> {
  const params: Record<string, string> = {};
  if (keyword) {
    params.keyword = keyword;
  }
  const res = await api.get<Attraction[]>(`/cities/${cityId}/attractions`, { params });
  return res.data;
}

export async function saveItinerary(data: SaveItineraryRequest): Promise<{ id: string; createdAt: string }> {
  const res = await api.post<{ id: string; createdAt: string }>('/itineraries', data);
  return res.data;
}

export async function getItineraries(): Promise<ItinerarySummary[]> {
  const res = await api.get<ItinerarySummary[]>('/itineraries');
  return res.data;
}

export async function getItinerary(id: string): Promise<Itinerary> {
  const res = await api.get<Itinerary>(`/itineraries/${id}`);
  return res.data;
}

export async function deleteItinerary(id: string): Promise<{ success: boolean }> {
  const res = await api.delete<{ success: boolean }>(`/itineraries/${id}`);
  return res.data;
}

export async function createShareLink(itineraryId: string): Promise<ShareLink> {
  const res = await api.post<ShareLink>(`/itineraries/${itineraryId}/share`);
  return res.data;
}

export async function getSharedItinerary(token: string): Promise<Itinerary> {
  const res = await api.get<Itinerary>(`/shared/${token}`);
  return res.data;
}
