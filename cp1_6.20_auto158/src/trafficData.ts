export interface TrafficPoint {
  x: number;
  z: number;
  flow: number;
}

export interface RoadSegment {
  id: string;
  name: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  isHorizontal: boolean;
}

export interface HourlyData {
  hour: number;
  flow: number;
}

export type TrafficDataCallback = (data: TrafficPoint[]) => void;

class TrafficDataGenerator {
  private subscribers: Set<TrafficDataCallback> = new Set();
  private intervalId: number | null = null;
  private trafficData: TrafficPoint[] = [];
  private roadSegments: RoadSegment[] = [];
  private hourlyData: Map<string, HourlyData[]> = new Map();
  private gridSize = 30;
  private cellSize = 2;

  constructor() {
    this.initRoadSegments();
    this.initHourlyData();
    this.generateInitialData();
  }

  private initRoadSegments() {
    const segmentNames = [
      '中山路', '人民路', '解放路', '建设路', '和平路',
      '南京路', '北京路', '上海路', '广州路', '深圳路'
    ];
    
    const horizontalRoads = [3, 7, 11, 15, 19, 23, 27];
    const verticalRoads = [3, 7, 11, 15, 19, 23, 27];

    let nameIndex = 0;
    horizontalRoads.forEach((z, i) => {
      this.roadSegments.push({
        id: `h-${i}`,
        name: `${segmentNames[nameIndex % segmentNames.length]}（东-西）`,
        startX: 0,
        startZ: z,
        endX: this.gridSize,
        endZ: z,
        isHorizontal: true,
      });
      nameIndex++;
    });

    verticalRoads.forEach((x, i) => {
      this.roadSegments.push({
        id: `v-${i}`,
        name: `${segmentNames[nameIndex % segmentNames.length]}（南-北）`,
        startX: x,
        startZ: 0,
        endX: x,
        endZ: this.gridSize,
        isHorizontal: false,
      });
      nameIndex++;
    });
  }

  private initHourlyData() {
    this.roadSegments.forEach(road => {
      const hourly: HourlyData[] = [];
      for (let h = 0; h < 24; h++) {
        let baseFlow = 200;
        if (h >= 7 && h <= 9) baseFlow = 800 + Math.random() * 200;
        else if (h >= 17 && h <= 19) baseFlow = 750 + Math.random() * 250;
        else if (h >= 10 && h <= 16) baseFlow = 400 + Math.random() * 200;
        else if (h >= 20 && h <= 22) baseFlow = 300 + Math.random() * 150;
        else baseFlow = 100 + Math.random() * 100;
        
        hourly.push({ hour: h, flow: Math.round(baseFlow) });
      }
      this.hourlyData.set(road.id, hourly);
    });
  }

  private generateInitialData() {
    const points: TrafficPoint[] = [];
    
    this.roadSegments.forEach(road => {
      const step = 1;
      if (road.isHorizontal) {
        for (let x = 0; x <= this.gridSize; x += step) {
          points.push({
            x,
            z: road.startZ,
            flow: 300 + Math.random() * 500,
          });
        }
      } else {
        for (let z = 0; z <= this.gridSize; z += step) {
          points.push({
            x: road.startX,
            z,
            flow: 300 + Math.random() * 500,
          });
        }
      }
    });

    this.trafficData = points;
  }

  public subscribe(callback: TrafficDataCallback): () => void {
    this.subscribers.add(callback);
    callback(this.trafficData);
    return () => this.subscribers.delete(callback);
  }

  public start(): void {
    if (this.intervalId !== null) return;
    
    this.intervalId = window.setInterval(() => {
      this.updateData();
    }, 1000);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private updateData(): void {
    const now = new Date();
    const currentHour = now.getHours();
    
    this.trafficData = this.trafficData.map(point => {
      let baseFlow = this.getBaseFlowForHour(currentHour);
      const variation = (Math.random() - 0.5) * 100;
      const newFlow = Math.max(50, Math.min(1000, baseFlow + variation));
      
      return {
        ...point,
        flow: point.flow + (newFlow - point.flow) * 0.3,
      };
    });

    this.notifySubscribers();
  }

  private getBaseFlowForHour(hour: number): number {
    if (hour >= 7 && hour <= 9) return 850;
    if (hour >= 17 && hour <= 19) return 800;
    if (hour >= 10 && hour <= 16) return 500;
    if (hour >= 20 && hour <= 22) return 350;
    if (hour >= 23 || hour <= 5) return 120;
    return 250;
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.trafficData));
  }

  public getTrafficData(): TrafficPoint[] {
    return this.trafficData;
  }

  public getRoadSegments(): RoadSegment[] {
    return this.roadSegments;
  }

  public getHourlyData(roadId: string): HourlyData[] {
    return this.hourlyData.get(roadId) || [];
  }

  public getFlowAtPosition(x: number, z: number): number | null {
    let closestPoint: TrafficPoint | null = null;
    let closestDist = Infinity;

    for (const point of this.trafficData) {
      const dist = Math.sqrt((point.x - x) ** 2 + (point.z - z) ** 2);
      if (dist < closestDist && dist < 1.5) {
        closestDist = dist;
        closestPoint = point;
      }
    }

    return closestPoint ? closestPoint.flow : null;
  }

  public getCongestionLevel(flow: number): 'low' | 'medium' | 'high' {
    if (flow < 400) return 'low';
    if (flow < 700) return 'medium';
    return 'high';
  }
}

export const trafficData = new TrafficDataGenerator();
