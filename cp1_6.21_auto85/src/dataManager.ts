import { v4 as uuidv4 } from 'uuid';
import type { Exhibit, Zone, TourRoute, TourStats, PathPoint, Vector3 } from './types';

const ZONES: Zone[] = [
  {
    id: 'ancient-greece',
    name: '古希腊展厅',
    floorColor: '#f5f5f0',
    accentColor: '#d4af37',
    colorPalette: ['#d4af37', '#c9a227', '#b8960f', '#e8c547', '#f0d76e'],
    bounds: { minX: -20, maxX: -8, minZ: -15, maxZ: 15 }
  },
  {
    id: 'renaissance',
    name: '文艺复兴展厅',
    floorColor: '#8b4513',
    accentColor: '#cd853f',
    colorPalette: ['#cd853f', '#a0522d', '#8b4513', '#d2691e', '#b8860b'],
    bounds: { minX: -6, maxX: 6, minZ: -15, maxZ: -3 }
  },
  {
    id: 'impressionism',
    name: '印象派展厅',
    floorColor: '#87ceeb',
    accentColor: '#4682b4',
    colorPalette: ['#4682b4', '#5f9ea0', '#6495ed', '#87ceeb', '#b0c4de'],
    bounds: { minX: -6, maxX: 6, minZ: 3, maxZ: 15 }
  },
  {
    id: 'modern-art',
    name: '现代艺术展厅',
    floorColor: '#ff6347',
    accentColor: '#dc143c',
    colorPalette: ['#dc143c', '#ff6347', '#ff7f50', '#ff4500', '#ee5c42'],
    bounds: { minX: 8, maxX: 20, minZ: -15, maxZ: -3 }
  },
  {
    id: 'sculpture',
    name: '雕塑展厅',
    floorColor: '#696969',
    accentColor: '#808080',
    colorPalette: ['#808080', '#696969', '#778899', '#708090', '#a9a9a9'],
    bounds: { minX: 8, maxX: 20, minZ: 3, maxZ: 15 }
  },
  {
    id: 'ancient-egypt',
    name: '古埃及展厅',
    floorColor: '#daa520',
    accentColor: '#b8860b',
    colorPalette: ['#daa520', '#b8860b', '#cd853f', '#d2691e', '#8b7355'],
    bounds: { minX: -20, maxX: -8, minZ: -15, maxZ: -3 }
  }
];

const DEFAULT_EXHIBITS: Exhibit[] = [
  {
    id: 'exhibit-1',
    name: '雅典娜神像',
    era: '公元前5世纪',
    audioText: '这尊雅典娜神像展现了古希腊雕塑的巅峰技艺，是帕特农神庙的主神像。',
    position: { x: -14, y: 0, z: -8 },
    zoneId: 'ancient-greece',
    color: '#d4af37',
    size: 1.0,
    relatedExhibitIds: ['exhibit-2']
  },
  {
    id: 'exhibit-2',
    name: '希腊陶罐',
    era: '公元前6世纪',
    audioText: '黑绘式陶罐，描绘了特洛伊战争的场景，是古希腊陶艺的代表作品。',
    position: { x: -12, y: 0, z: 5 },
    zoneId: 'ancient-greece',
    color: '#c9a227',
    size: 0.9,
    relatedExhibitIds: ['exhibit-1']
  },
  {
    id: 'exhibit-3',
    name: '蒙娜丽莎复刻',
    era: '文艺复兴时期',
    audioText: '这幅作品展现了文艺复兴时期对人体和光影的深刻理解。',
    position: { x: 0, y: 0, z: -10 },
    zoneId: 'renaissance',
    color: '#cd853f',
    size: 1.1,
    relatedExhibitIds: ['exhibit-4']
  },
  {
    id: 'exhibit-4',
    name: '大卫雕像复刻',
    era: '1501-1504',
    audioText: '米开朗基罗的大卫雕像代表了文艺复兴时期人体美的最高追求。',
    position: { x: 3, y: 0, z: -6 },
    zoneId: 'renaissance',
    color: '#a0522d',
    size: 1.2,
    relatedExhibitIds: ['exhibit-3', 'exhibit-10']
  },
  {
    id: 'exhibit-5',
    name: '睡莲',
    era: '1906年',
    audioText: '莫奈的睡莲系列是印象派的代表，捕捉了光影在水面上的瞬间变化。',
    position: { x: -2, y: 0, z: 8 },
    zoneId: 'impressionism',
    color: '#4682b4',
    size: 1.0,
    relatedExhibitIds: ['exhibit-6']
  },
  {
    id: 'exhibit-6',
    name: '日出印象',
    era: '1872年',
    audioText: '莫奈的日出印象开创了印象派，描绘了勒阿弗尔港口的晨雾景象。',
    position: { x: 3, y: 0, z: 12 },
    zoneId: 'impressionism',
    color: '#5f9ea0',
    size: 0.85,
    relatedExhibitIds: ['exhibit-5']
  },
  {
    id: 'exhibit-7',
    name: '星空复刻',
    era: '1889年',
    audioText: '梵高的星空以漩涡般的笔触展现了夜空的动感与内在情感的表达。',
    position: { x: 12, y: 0, z: -10 },
    zoneId: 'modern-art',
    color: '#dc143c',
    size: 1.0,
    relatedExhibitIds: []
  },
  {
    id: 'exhibit-8',
    name: '呐喊复刻',
    era: '1893年',
    audioText: '蒙克的呐喊表现了现代人的焦虑与存在主义的恐惧，极具表现力。',
    position: { x: 16, y: 0, z: -6 },
    zoneId: 'modern-art',
    color: '#ff6347',
    size: 0.95,
    relatedExhibitIds: ['exhibit-7']
  },
  {
    id: 'exhibit-9',
    name: '思想者',
    era: '1880年',
    audioText: '罗丹的思想者代表了人类对存在的深沉思考，是现代雕塑的里程碑。',
    position: { x: 14, y: 0, z: 8 },
    zoneId: 'sculpture',
    color: '#808080',
    size: 1.1,
    relatedExhibitIds: ['exhibit-10']
  },
  {
    id: 'exhibit-10',
    name: '大卫青铜像',
    era: '1875年',
    color: '#778899',
    audioText: '罗丹的青铜时代展现了人体的真实质感，是雕塑艺术的突破之作。',
    position: { x: 17, y: 0, z: 12 },
    zoneId: 'sculpture',
    size: 0.9,
    relatedExhibitIds: ['exhibit-9']
  },
  {
    id: 'exhibit-11',
    name: '法老黄金面具',
    era: '公元前14世纪',
    audioText: '图坦卡蒙的黄金面具是古埃及艺术的代表，工艺精湛，金碧辉煌。',
    position: { x: -16, y: 0, z: -12 },
    zoneId: 'ancient-egypt',
    color: '#daa520',
    size: 1.05,
    relatedExhibitIds: ['exhibit-12']
  },
  {
    id: 'exhibit-12',
    name: '象形文字石碑',
    era: '公元前13世纪',
    audioText: '这块石碑记录了古埃及的宗教仪式，是研究古埃及文明的重要文物。',
    position: { x: -12, y: 0, z: -10 },
    zoneId: 'ancient-egypt',
    color: '#b8860b',
    size: 0.85,
    relatedExhibitIds: ['exhibit-11']
  }
];

export class DataManager {
  private exhibits: Map<string, Exhibit> = new Map();
  private zones: Map<string, Zone> = new Map();
  private currentRoute: TourRoute | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initializeZones();
    this.initializeExhibits();
  }

  private initializeZones(): void {
    ZONES.forEach(zone => {
      this.zones.set(zone.id, zone);
    });
  }

  private initializeExhibits(): void {
    DEFAULT_EXHIBITS.forEach(exhibit => {
      this.exhibits.set(exhibit.id, exhibit);
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getZones(): Zone[] {
    return Array.from(this.zones.values());
  }

  getZoneById(id: string): Zone | undefined {
    return this.zones.get(id);
  }

  getExhibits(): Exhibit[] {
    return Array.from(this.exhibits.values());
  }

  getExhibitById(id: string): Exhibit | undefined {
    return this.exhibits.get(id);
  }

  getExhibitsByZone(zoneId: string): Exhibit[] {
    return this.getExhibits().filter(e => e.zoneId === zoneId);
  }

  addExhibit(data: Omit<Exhibit, 'id' | 'color' | 'size'> & { color?: string; size?: number }): Exhibit {
    const zone = this.zones.get(data.zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${data.zoneId}`);
    }

    const color = data.color || zone.colorPalette[Math.floor(Math.random() * zone.colorPalette.length)];
    const size = data.size || (0.8 + Math.random() * 0.4);

    const exhibit: Exhibit = {
      id: uuidv4(),
      name: data.name,
      era: data.era,
      audioText: data.audioText,
      position: data.position,
      zoneId: data.zoneId,
      color,
      size,
      relatedExhibitIds: data.relatedExhibitIds || []
    };

    this.exhibits.set(exhibit.id, exhibit);
    this.notifyListeners();
    return exhibit;
  }

  updateExhibit(id: string, updates: Partial<Exhibit>): Exhibit | undefined {
    const exhibit = this.exhibits.get(id);
    if (!exhibit) return undefined;

    const updated = { ...exhibit, ...updates };
    this.exhibits.set(id, updated);
    this.notifyListeners();
    return updated;
  }

  deleteExhibit(id: string): boolean {
    const deleted = this.exhibits.delete(id);
    if (deleted) {
      this.getExhibits().forEach(exhibit => {
        exhibit.relatedExhibitIds = exhibit.relatedExhibitIds.filter(rid => rid !== id);
      });
      this.notifyListeners();
    }
    return deleted;
  }

  getRelatedExhibits(exhibitId: string): Exhibit[] {
    const exhibit = this.exhibits.get(exhibitId);
    if (!exhibit) return [];
    return exhibit.relatedExhibitIds
      .map(id => this.exhibits.get(id))
      .filter((e): e is Exhibit => e !== undefined);
  }

  setCurrentRoute(route: TourRoute | null): void {
    this.currentRoute = route;
    this.notifyListeners();
  }

  getCurrentRoute(): TourRoute | null {
    return this.currentRoute;
  }

  calculateTourStats(route: TourRoute): TourStats {
    const exhibits = route.exhibitIds
      .map(id => this.exhibits.get(id))
      .filter((e): e is Exhibit => e !== undefined);

    let totalDistance = 0;
    const points = route.pathPoints;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dz = points[i].z - points[i - 1].z;
      totalDistance += Math.sqrt(dx * dx + dz * dz);
    }

    const walkingTime = totalDistance / 1.2;
    const exhibitStayTime = exhibits.length * 3;
    const totalTime = walkingTime + exhibitStayTime;

    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      walkingTime: Math.round(walkingTime * 10) / 10,
      exhibitStayTime,
      totalTime: Math.round(totalTime * 10) / 10,
      exhibitCount: exhibits.length
    };
  }

  exportRouteToJSON(route: TourRoute): string {
    const exhibits = route.exhibitIds
      .map(id => this.exhibits.get(id))
      .filter((e): e is Exhibit => e !== undefined)
      .map(e => ({
        id: e.id,
        name: e.name,
        position: e.position,
        zoneId: e.zoneId,
        relatedExhibitIds: e.relatedExhibitIds
      }));

    const exportData = {
      route: {
        id: route.id,
        name: route.name,
        startZoneId: route.startZoneId,
        endZoneId: route.endZoneId,
        exhibitIds: route.exhibitIds,
        controlPoints: route.controlPoints
      },
      exhibits
    };

    return JSON.stringify(exportData, null, 2);
  }

  getRandomPositionInZone(zoneId: string): Vector3 {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      return { x: 0, y: 0, z: 0 };
    }
    const x = zone.bounds.minX + 2 + Math.random() * (zone.bounds.maxX - zone.bounds.minX - 4);
    const z = zone.bounds.minZ + 2 + Math.random() * (zone.bounds.maxZ - zone.bounds.minZ - 4);
    return { x, y: 0, z };
  }
}

export const dataManager = new DataManager();
