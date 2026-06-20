import React from 'react';
import type { TravelMemory, MemoryStats } from '@/types';

type Listener = (memories: TravelMemory[]) => void;

class MemoryStore {
  private memories: Map<string, TravelMemory>;
  private listeners: Set<Listener>;

  constructor() {
    this.memories = new Map();
    this.listeners = new Set();
    this.initializeWithSampleData();
  }

  private initializeWithSampleData(): void {
    const sampleMemories: TravelMemory[] = [
      {
        id: 'sample-1',
        name: '埃菲尔铁塔',
        lat: 48.8584,
        lng: 2.2945,
        photo: '',
        note: '浪漫之都的标志性建筑，夜景格外迷人。',
        rating: 5,
        country: '法国',
        city: '巴黎',
        createdAt: Date.now() - 86400000 * 30,
        visitedAt: Date.now() - 86400000 * 30,
      },
      {
        id: 'sample-2',
        name: '东京塔',
        lat: 35.6586,
        lng: 139.7454,
        photo: '',
        note: '繁华都市中的一抹温暖橙红。',
        rating: 4,
        country: '日本',
        city: '东京',
        createdAt: Date.now() - 86400000 * 20,
        visitedAt: Date.now() - 86400000 * 20,
      },
      {
        id: 'sample-3',
        name: '长城',
        lat: 40.4319,
        lng: 116.5704,
        photo: '',
        note: '不到长城非好汉，壮观的历史奇迹。',
        rating: 5,
        country: '中国',
        city: '北京',
        createdAt: Date.now() - 86400000 * 10,
        visitedAt: Date.now() - 86400000 * 10,
      },
    ];

    sampleMemories.forEach((m) => this.memories.set(m.id, m));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const memories = this.getAll();
    this.listeners.forEach((listener) => listener(memories));
  }

  getAll(): TravelMemory[] {
    return Array.from(this.memories.values()).sort(
      (a, b) => (a.visitedAt ?? a.createdAt) - (b.visitedAt ?? b.createdAt)
    );
  }

  getById(id: string): TravelMemory | undefined {
    return this.memories.get(id);
  }

  add(memory: Omit<TravelMemory, 'id' | 'createdAt'>): TravelMemory {
    const id = `memory-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newMemory: TravelMemory = {
      ...memory,
      id,
      createdAt: Date.now(),
    };
    this.memories.set(id, newMemory);
    this.notify();
    return newMemory;
  }

  update(id: string, data: Partial<Omit<TravelMemory, 'id' | 'createdAt'>>): TravelMemory | undefined {
    const existing = this.memories.get(id);
    if (!existing) return undefined;

    const updated: TravelMemory = { ...existing, ...data };
    this.memories.set(id, updated);
    this.notify();
    return updated;
  }

  delete(id: string): boolean {
    const deleted = this.memories.delete(id);
    if (deleted) this.notify();
    return deleted;
  }

  getStats(): MemoryStats {
    const memories = this.getAll();
    const countries = new Set<string>();
    const cities = new Set<string>();
    let totalRating = 0;

    memories.forEach((m) => {
      if (m.country) countries.add(m.country);
      if (m.city) cities.add(m.city);
      totalRating += m.rating;
    });

    return {
      totalCount: memories.length,
      countries: Array.from(countries),
      cities: Array.from(cities),
      averageRating: memories.length > 0 ? totalRating / memories.length : 0,
    };
  }

  async compressImage(file: File, maxSizeKB: number = 100): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 800;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建canvas上下文'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.8;
          let result = canvas.toDataURL('image/jpeg', quality);

          while (result.length / 1024 > maxSizeKB && quality > 0.1) {
            quality -= 0.1;
            result = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(result);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }
}

export const memoryStore = new MemoryStore();

export function useMemories(): {
  memories: TravelMemory[];
  add: typeof memoryStore.add;
  update: typeof memoryStore.update;
  delete: typeof memoryStore.delete;
  getStats: typeof memoryStore.getStats;
  compressImage: typeof memoryStore.compressImage;
} {
  const [memories, setMemories] = React.useState<TravelMemory[]>(() => memoryStore.getAll());

  React.useEffect(() => {
    return memoryStore.subscribe(setMemories);
  }, []);

  return {
    memories,
    add: memoryStore.add.bind(memoryStore),
    update: memoryStore.update.bind(memoryStore),
    delete: memoryStore.delete.bind(memoryStore),
    getStats: memoryStore.getStats.bind(memoryStore),
    compressImage: memoryStore.compressImage.bind(memoryStore),
  };
}
