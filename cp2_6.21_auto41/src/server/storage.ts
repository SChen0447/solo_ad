import { v4 as uuidv4 } from 'uuid';

export interface FilterParams {
  brightness: number;
  contrast: number;
  saturation: number;
  hueRotate: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  backgroundColor: string;
  backgroundOpacity: number;
}

export interface Layer {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  zIndex: number;
  imageUrl?: string;
  filters?: FilterParams;
  text?: string;
  textStyle?: TextStyle;
}

export interface Collage {
  id: string;
  name: string;
  description: string;
  author: string;
  layers: Layer[];
  likes: number;
  createdAt: number;
  canvasWidth: number;
  canvasHeight: number;
  background: string;
}

const collagesMap = new Map<string, Collage>();

export function generateId(): string {
  return uuidv4();
}

export function createCollage(data: Omit<Collage, 'id' | 'createdAt' | 'likes'>): Collage {
  const collage: Collage = {
    ...data,
    id: generateId(),
    createdAt: Date.now(),
    likes: 0,
  };
  collagesMap.set(collage.id, collage);
  return collage;
}

export function getCollageById(id: string): Collage | undefined {
  return collagesMap.get(id);
}

export function getAllCollages(sortBy: 'time' | 'likes' = 'time'): Collage[] {
  const collages = Array.from(collagesMap.values());
  if (sortBy === 'time') {
    collages.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    collages.sort((a, b) => b.likes - a.likes);
  }
  return collages;
}

export function getCollagesPaginated(page: number, pageSize: number, sortBy: 'time' | 'likes' = 'time'): { collages: Collage[]; total: number } {
  const all = getAllCollages(sortBy);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    collages: all.slice(start, end),
    total: all.length,
  };
}

export function updateCollage(id: string, updates: Partial<Omit<Collage, 'id' | 'createdAt'>>): Collage | undefined {
  const existing = collagesMap.get(id);
  if (!existing) return undefined;
  const updated: Collage = { ...existing, ...updates };
  collagesMap.set(id, updated);
  return updated;
}

export function likeCollage(id: string): Collage | undefined {
  const existing = collagesMap.get(id);
  if (!existing) return undefined;
  existing.likes += 1;
  return existing;
}

export function deleteCollage(id: string): boolean {
  return collagesMap.delete(id);
}
