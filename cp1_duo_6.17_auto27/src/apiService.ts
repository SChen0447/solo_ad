import axios from 'axios';
import type { Character, CharacterRelation, TimelineEvent, Chapter, Volume } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const getCharacters = async (): Promise<Character[]> => {
  const response = await api.get('/characters');
  return response.data;
};

export const getCharacter = async (id: string): Promise<Character> => {
  const response = await api.get(`/characters/${id}`);
  return response.data;
};

export const createCharacter = async (character: Omit<Character, 'id'>): Promise<Character> => {
  const response = await api.post('/characters', character);
  return response.data;
};

export const updateCharacter = async (id: string, character: Partial<Character>): Promise<Character> => {
  const response = await api.put(`/characters/${id}`, character);
  return response.data;
};

export const deleteCharacter = async (id: string): Promise<void> => {
  await api.delete(`/characters/${id}`);
};

export const getRelations = async (): Promise<CharacterRelation[]> => {
  const response = await api.get('/relations');
  return response.data;
};

export const createRelation = async (relation: Omit<CharacterRelation, 'id'>): Promise<CharacterRelation> => {
  const response = await api.post('/relations', relation);
  return response.data;
};

export const updateRelation = async (id: string, relation: Partial<CharacterRelation>): Promise<CharacterRelation> => {
  const response = await api.put(`/relations/${id}`, relation);
  return response.data;
};

export const deleteRelation = async (id: string): Promise<void> => {
  await api.delete(`/relations/${id}`);
};

export const getTimelineEvents = async (): Promise<TimelineEvent[]> => {
  const response = await api.get('/events');
  return response.data;
};

export const getTimelineEvent = async (id: string): Promise<TimelineEvent> => {
  const response = await api.get(`/events/${id}`);
  return response.data;
};

export const createTimelineEvent = async (event: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent> => {
  const response = await api.post('/events', event);
  return response.data;
};

export const updateTimelineEvent = async (id: string, event: Partial<TimelineEvent>): Promise<TimelineEvent> => {
  const response = await api.put(`/events/${id}`, event);
  return response.data;
};

export const deleteTimelineEvent = async (id: string): Promise<void> => {
  await api.delete(`/events/${id}`);
};

export const getChapters = async (): Promise<Chapter[]> => {
  const response = await api.get('/chapters');
  return response.data;
};

export const getChapter = async (id: string): Promise<Chapter> => {
  const response = await api.get(`/chapters/${id}`);
  return response.data;
};

export const createChapter = async (chapter: Omit<Chapter, 'id'>): Promise<Chapter> => {
  const response = await api.post('/chapters', chapter);
  return response.data;
};

export const updateChapter = async (id: string, chapter: Partial<Chapter>): Promise<Chapter> => {
  const response = await api.put(`/chapters/${id}`, chapter);
  return response.data;
};

export const deleteChapter = async (id: string): Promise<void> => {
  await api.delete(`/chapters/${id}`);
};

export const getVolumes = async (): Promise<Volume[]> => {
  const response = await api.get('/volumes');
  return response.data;
};
