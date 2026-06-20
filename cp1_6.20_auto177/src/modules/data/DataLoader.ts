import axios from 'axios';

export interface EarthquakeData {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
}

export interface DataLoaderOptions {
  onLoad?: (data: EarthquakeData[]) => void;
  onError?: (error: Error) => void;
}

export class DataLoader {
  private data: EarthquakeData[] = [];
  private options: DataLoaderOptions;

  constructor(options: DataLoaderOptions = {}) {
    this.options = options;
  }

  public async loadData(filePath: string = '/data/earthquake_sample.json'): Promise<EarthquakeData[]> {
    try {
      const response = await axios.get<EarthquakeData[]>(filePath);
      this.data = this.parseData(response.data);
      
      console.log(`成功加载 ${this.data.length} 条地震数据`);
      
      if (this.options.onLoad) {
        this.options.onLoad(this.data);
      }
      
      return this.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载数据失败';
      console.error('加载地震数据失败:', error);
      
      if (this.options.onError) {
        this.options.onError(new Error(errorMessage));
      }
      
      throw new Error(errorMessage);
    }
  }

  private parseData(rawData: EarthquakeData[]): EarthquakeData[] {
    return rawData.map((item, index) => ({
      id: item.id || `eq_${index}_${Date.now()}`,
      timestamp: Number(item.timestamp),
      latitude: Math.max(-90, Math.min(90, Number(item.latitude))),
      longitude: Math.max(-180, Math.min(180, Number(item.longitude))),
      depth: Math.max(0, Math.min(1, Number(item.depth) / 70)),
      magnitude: Math.max(3, Math.min(7, Number(item.magnitude)))
    }));
  }

  public getData(): EarthquakeData[] {
    return this.data;
  }

  public getTimeRange(): { min: number; max: number } {
    if (this.data.length === 0) {
      return { min: 0, max: 0 };
    }
    
    const timestamps = this.data.map(d => d.timestamp);
    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps)
    };
  }

  public getMagnitudeRange(): { min: number; max: number } {
    if (this.data.length === 0) {
      return { min: 3, max: 7 };
    }
    
    const magnitudes = this.data.map(d => d.magnitude);
    return {
      min: Math.min(...magnitudes),
      max: Math.max(...magnitudes)
    };
  }

  public getDepthRange(): { min: number; max: number } {
    if (this.data.length === 0) {
      return { min: 0, max: 1 };
    }
    
    const depths = this.data.map(d => d.depth);
    return {
      min: Math.min(...depths),
      max: Math.max(...depths)
    };
  }

  public filterByTime(startTime: number, endTime: number): EarthquakeData[] {
    return this.data.filter(d => d.timestamp >= startTime && d.timestamp <= endTime);
  }

  public filterByMagnitude(minMag: number, maxMag: number): EarthquakeData[] {
    return this.data.filter(d => d.magnitude >= minMag && d.magnitude < maxMag);
  }
}
