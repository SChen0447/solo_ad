import axios from 'axios';
import paintingsData from '../data/paintings.json';

export interface Exhibition {
  id: string;
  name: string;
  nameEn: string;
  startZ: number;
  endZ: number;
  color: string;
}

export interface Painting {
  id: number;
  title: string;
  titleEn: string;
  author: string;
  year: number;
  exhibitionId: string;
  description: string;
  wall: 'left' | 'right';
  position: number;
  thumbnailUrl: string;
  highResUrl: string;
}

export interface GalleryData {
  exhibitions: Exhibition[];
  paintings: Painting[];
}

class DataService {
  private socketMock: { on: (event: string, callback: (data: any) => void) => void; emit: (event: string, data: any) => void } | null = null;
  private exhibitionListeners: Map<string, (data: { exhibitionId: string }) => void> = new Map();

  constructor() {
    this.setupMockSocket();
  }

  private setupMockSocket() {
    this.socketMock = {
      on: (event: string, callback: (data: any) => void) => {
        if (event === 'exhibitionChange') {
          this.exhibitionListeners.set('main', callback);
        }
      },
      emit: (event: string, data: any) => {
        if (event === 'exhibitionChange') {
          this.exhibitionListeners.forEach((cb) => cb(data));
        }
      }
    };
  }

  async getGalleryData(): Promise<GalleryData> {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      return paintingsData as unknown as GalleryData;
    } catch (error) {
      try {
        const response = await axios.get('/data/paintings.json');
        return response.data;
      } catch {
        return paintingsData as unknown as GalleryData;
      }
    }
  }

  getSocket() {
    return this.socketMock;
  }

  emitExhibitionChange(exhibitionId: string) {
    this.socketMock?.emit('exhibitionChange', { exhibitionId });
  }

  onExhibitionChange(callback: (data: { exhibitionId: string }) => void) {
    this.socketMock?.on('exhibitionChange', callback);
  }

  async getPaintingById(id: number): Promise<Painting | undefined> {
    const data = await this.getGalleryData();
    return data.paintings.find(p => p.id === id);
  }

  async getPaintingsByExhibition(exhibitionId: string): Promise<Painting[]> {
    const data = await this.getGalleryData();
    return data.paintings.filter(p => p.exhibitionId === exhibitionId);
  }

  async getPaintingsByAuthor(author: string): Promise<Painting[]> {
    const data = await this.getGalleryData();
    return data.paintings.filter(p => p.author === author);
  }

  async getPaintingsByYearRange(startYear: number, endYear: number): Promise<Painting[]> {
    const data = await this.getGalleryData();
    return data.paintings.filter(p => p.year >= startYear && p.year <= endYear);
  }

  getAllAuthors(data: GalleryData): string[] {
    return [...new Set(data.paintings.map(p => p.author))].sort();
  }

  getYearRange(data: GalleryData): { min: number; max: number } {
    const years = data.paintings.map(p => p.year);
    return {
      min: Math.min(...years),
      max: Math.max(...years)
    };
  }
}

export const dataService = new DataService();
