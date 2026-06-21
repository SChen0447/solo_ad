import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { HeatmapRenderer, HeatPointData } from './HeatmapRenderer';
import { PathRenderer, MigrationPathData } from './PathRenderer';
import { TimeController } from './TimeController';
import { InfoPanel } from './InfoPanel';

interface SpeciesDef {
  id: string;
  name: string;
  icon: string;
  baseColor: number;
  count: number;
  pathCount: number;
  centerLat: number;
  centerLon: number;
  spread: number;
  seasonality: number;
}

const SPECIES: SpeciesDef[] = [
  { id: 'zebra',    name: '斑马',     icon: '🦓', baseColor: 0x3b82f6, count: 35, pathCount: 3, centerLat: -2,  centerLon: 35, spread: 9, seasonality: 1.0 },
  { id: 'wildebeest',name:'角马',     icon: '🐃', baseColor: 0xf59e0b, count: 38, pathCount: 3, centerLat: -3,  centerLon: 34, spread: 10, seasonality: 1.2 },
  { id: 'lion',     name: '狮子',     icon: '🦁', baseColor: 0xef4444, count: 22, pathCount: 2, centerLat: -4,  centerLon: 33, spread: 8, seasonality: 0.6 },
  { id: 'elephant', name: '大象',     icon: '🐘', baseColor: 0x8b5cf6, count: 25, pathCount: 2, centerLat: -1,  centerLon: 37, spread: 11, seasonality: 0.5 },
  { id: 'giraffe',  name: '长颈鹿',   icon: '🦒', baseColor: 0x10b981, count: 28, pathCount: 2, centerLat: -3,  centerLon: 36, spread: 9, seasonality: 0.7 },
  { id: 'rhino',    name: '犀牛',     icon: '🦏', baseColor: 0x06b6d4, count: 18, pathCount: 2, centerLat: -2,  centerLon: 32, spread: 7, seasonality: 0.4 }
];

function generateDates(startY: number, startM: number, startD: number, days: number): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(startY, startM - 1, startD));
  for (let i = 0; i < days; i++) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    out.push(`${y}-${m}-${day}`);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function dateToDayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const start = new Date(Date.UTC(y, 0, 1));
  return Math.floor((dt.getTime() - start.getTime()) / 86400000);
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

interface HeatSeed {
  id: string;
  speciesId: string;
  baseLat: number;
  baseLon: number;
  baseDensity: number;
  phase: number;
  amplitude: number;
  wanderLat: number;
  wanderLon: number;
  wanderSpeed: number;
}

function generateHeatSeeds(species: SpeciesDef[], rand: () => number): HeatSeed[] {
  const seeds: HeatSeed[] = [];
  let counter = 1000;
  for (const sp of species) {
    for (let i = 0; i < sp.count; i++) {
      const ang = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * sp.spread;
      const bl = sp.centerLat + Math.sin(ang) * dist;
      const blo = sp.centerLon + Math.cos(ang) * dist * 1.3;
      seeds.push({
        id: `${sp.id}-${counter++}`,
        speciesId: sp.id,
        baseLat: Math.max(-35, Math.min(35, bl)),
        baseLon: Math.max(-180, Math.min(180, blo)),
        baseDensity: 25 + rand() * 50,
        phase: rand() * Math.PI * 2,
        amplitude: 15 + rand() * 25,
        wanderLat: rand() * 2.5,
        wanderLon: rand() * 2.5,
        wanderSpeed: 0.002 + rand() * 0.005
      });
    }
  }
  return seeds;
}

function heatSeedsToData(seeds: HeatSeed[], speciesMap: Map<string, SpeciesDef>, date: string): HeatPointData[] {
  const dayIdx = dateToDayIndex(date);
  const yearProgress = dayIdx / 365;
  return seeds.map(s => {
    const sp = speciesMap.get(s.speciesId)!;
    const seasonPhase = yearProgress * Math.PI * 2 * sp.seasonality;
    const seasonalLat = Math.sin(seasonPhase + s.phase) * 3.5 * sp.seasonality;
    const seasonalLon = Math.cos(seasonPhase * 0.7 + s.phase) * 4.0 * sp.seasonality;

    const wanderT = dayIdx * s.wanderSpeed;
    const wLat = Math.sin(wanderT) * s.wanderLat;
    const wLon = Math.cos(wanderT * 1.1) * s.wanderLon;

    const densityVar = Math.sin(seasonPhase + s.phase) * s.amplitude;
    const noise = (Math.sin(dayIdx * 0.12 + s.phase) + Math.cos(dayIdx * 0.07)) * 4;
    const density = Math.max(2, Math.min(100, s.baseDensity + densityVar + noise));

    const trend: number[] = [];
    for (let t = 90; t >= 0; t -= 3) {
      const td = dayIdx - t;
      const tp = (td / 365) * Math.PI * 2 * sp.seasonality;
      const tv = s.baseDensity + Math.sin(tp + s.phase) * s.amplitude + (Math.sin(td * 0.12) + Math.cos(td * 0.07)) * 3;
      trend.push(Math.max(2, Math.min(100, Math.round(tv))));
    }

    return {
      id: s.id,
      lat: s.baseLat + seasonalLat + wLat,
      lon: s.baseLon + seasonalLon + wLon,
      density: Math.round(density),
      speciesId: s.speciesId,
      speciesName: sp.name,
      speciesIcon: sp.icon,
      date,
      trend
    };
  });
}

interface PathSeed {
  id: string;
  speciesId: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  midLat: number;
  midLon: number;
  startDayOffset: number;
  durationDays: number;
}

function generatePathSeeds(species: SpeciesDef[], rand: () => number, totalDays: number): PathSeed[] {
  const seeds: PathSeed[] = [];
  let counter = 1;
  for (const sp of species) {
    for (let i = 0; i < sp.pathCount; i++) {
      const ang = rand() * Math.PI * 2;
      const dist = 2 + rand() * sp.spread * 0.6;
      const sLat = sp.centerLat + Math.sin(ang) * dist;
      const sLon = sp.centerLon + Math.cos(ang) * dist * 1.3;

      const migrAng = ang + Math.PI + (rand() - 0.5) * 0.9;
      const migrDist = sp.spread * (0.7 + rand() * 0.5);
      const eLat = sp.centerLat + Math.sin(migrAng) * migrDist;
      const eLon = sp.centerLon + Math.cos(migrAng) * migrDist * 1.3;

      const mLat = (sLat + eLat) * 0.5 + (rand() - 0.5) * sp.spread * 0.4;
      const mLon = (sLon + eLon) * 0.5 + (rand() - 0.5) * sp.spread * 0.5;

      const duration = Math.floor(60 + rand() * (totalDays * 0.6));
      const startOffset = Math.floor(rand() * Math.max(1, totalDays - duration));

      seeds.push({
        id: `path-${sp.id}-${counter++}`,
        speciesId: sp.id,
        startLat: sLat,
        startLon: sLon,
        endLat: eLat,
        endLon: eLon,
        midLat: mLat,
        midLon: mLon,
        startDayOffset: startOffset,
        durationDays: duration
      });
    }
  }
  return seeds;
}

function pathSeedsToData(seeds: PathSeed[], speciesMap: Map<string, SpeciesDef>, dates: string[]): MigrationPathData[] {
  return seeds.map(s => {
    const sp = speciesMap.get(s.speciesId)!;
    const waypoints: { lat: number; lon: number; date: string }[] = [];
    const wpCount = 14;
    for (let i = 0; i < wpCount; i++) {
      const t = i / (wpCount - 1);
      const t2 = t * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const bezierLat = mt2 * s.startLat + 2 * mt * t * s.midLat + t2 * s.endLat;
      const bezierLon = mt2 * s.startLon + 2 * mt * t * s.midLon + t2 * s.endLon;
      const dayIdx = Math.min(dates.length - 1, s.startDayOffset + Math.floor(t * s.durationDays));
      waypoints.push({
        lat: bezierLat + Math.sin(t * Math.PI * 2 + s.startDayOffset) * 0.5,
        lon: bezierLon + Math.cos(t * Math.PI * 2 + s.startDayOffset) * 0.5,
        date: dates[dayIdx]
      });
    }
    return {
      id: s.id,
      speciesId: s.speciesId,
      speciesName: sp.name,
      speciesIcon: sp.icon,
      waypoints
    };
  });
}

class SpeciesSidebar {
  private container: HTMLElement;
  private species: SpeciesDef[];
  private activeId: string = 'all';
  private changeHandlers: Array<(id: string) => void> = [];
  private items: Map<string, HTMLElement> = new Map();
  private recordCountEls: Map<string, HTMLElement> = new Map();

  constructor(containerId: string, species: SpeciesDef[]) {
    this.container = document.getElementById(containerId)!;
    this.species = species;
    this.render();
  }

  private render(): void {
    const allItem = this.createItem({
      id: 'all',
      name: '全部物种',
      icon: '🌍',
      baseColor: 0x3b82f6,
      count: this.species.reduce((s, x) => s + x.count, 0),
      pathCount: 0,
      centerLat: 0, centerLon: 0, spread: 0, seasonality: 0
    }, true);
    this.container.appendChild(allItem);

    for (const sp of this.species) {
      const el = this.createItem(sp, false);
      this.container.appendChild(el);
    }
  }

  private createItem(sp: SpeciesDef, isAll: boolean): HTMLElement {
    const item = document.createElement('div');
    item.className = 'species-item' + (isAll ? ' active' : '');
    item.dataset.id = sp.id;

    const icon = document.createElement('span');
    icon.className = 'species-icon';
    icon.textContent = sp.icon;

    const name = document.createElement('span');
    name.className = 'species-name';
    name.textContent = sp.name;

    const count = document.createElement('span');
    count.className = 'species-count';
    count.textContent = String(sp.count);

    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(count);

    item.addEventListener('click', () => {
      this.setActive(sp.id);
    });

    this.items.set(sp.id, item);
    this.recordCountEls.set(sp.id, count);
    return item;
  }

  public setActive(id: string): void {
    if (id === this.activeId) return;
    this.activeId = id;
    for (const [sid, el] of this.items) {
      if (sid === id) el.classList.add('active');
      else el.classList.remove('active');
    }
    this.emitChange(id);
  }

  public getActive(): string {
    return this.activeId;
  }

  public updateCount(id: string, n: number): void {
    const el = this.recordCountEls.get(id);
    if (el) el.textContent = String(n);
  }

  public onChange(handler: (id: string) => void): void {
    if (this.changeHandlers.indexOf(handler) === -1) {
      this.changeHandlers.push(handler);
    }
  }

  private emitChange(id: string): void {
    for (const h of this.changeHandlers) {
      try { h(id); } catch (e) { console.error(e); }
    }
  }
}

class StatsUpdater {
  private areasEl: HTMLElement;
  private recordsEl: HTMLElement;
  private densityEl: HTMLElement;
  private activityEl: HTMLElement;

  constructor() {
    this.areasEl = document.getElementById('statAreas')!;
    this.recordsEl = document.getElementById('statRecords')!;
    this.densityEl = document.getElementById('statDensity')!;
    this.activityEl = document.getElementById('statActivity')!;
  }

  public update(points: HeatPointData[], activeSpecies: string, progress: number): void {
    const filtered = activeSpecies === 'all'
      ? points
      : points.filter(p => p.speciesId === activeSpecies);

    const areas = filtered.length;
    this.areasEl.textContent = String(areas);

    const totalRecords = Math.round(areas * (30 + progress * 60));
    this.recordsEl.textContent = totalRecords.toLocaleString();

    if (filtered.length > 0) {
      const avgD = filtered.reduce((s, p) => s + p.density, 0) / filtered.length;
      this.densityEl.textContent = avgD.toFixed(1);
    } else {
      this.densityEl.textContent = '0';
    }

    const activity = Math.round(20 + progress * 75 + Math.sin(progress * Math.PI * 4) * 5);
    this.activityEl.textContent = `${Math.max(0, Math.min(100, activity))}%`;
  }
}

class App {
  private sceneManager: SceneManager;
  private heatmap: HeatmapRenderer;
  private pathRenderer: PathRenderer;
  private timeController: TimeController;
  private infoPanel: InfoPanel;
  private sidebar: SpeciesSidebar;
  private stats: StatsUpdater;

  private dates: string[];
  private speciesMap: Map<string, SpeciesDef>;
  private heatSeeds: HeatSeed[];
  private pathSeeds: PathSeed[];
  private allPathData: MigrationPathData[];

  private currentSpecies: string = 'all';
  private currentDate: string;

  constructor() {
    const rand = seededRand(20240621);

    this.dates = generateDates(2024, 1, 1, 180);
    this.currentDate = this.dates[0];

    this.speciesMap = new Map(SPECIES.map(s => [s.id, s]));
    this.heatSeeds = generateHeatSeeds(SPECIES, rand);
    this.pathSeeds = generatePathSeeds(SPECIES, rand, this.dates.length);
    this.allPathData = pathSeedsToData(this.pathSeeds, this.speciesMap, this.dates);

    const canvasContainer = document.getElementById('canvas-container')!;

    this.sceneManager = new SceneManager(canvasContainer);
    this.heatmap = new HeatmapRenderer(this.sceneManager);
    this.pathRenderer = new PathRenderer(this.sceneManager);
    this.timeController = new TimeController();
    this.infoPanel = new InfoPanel(this.sceneManager);
    this.sidebar = new SpeciesSidebar('speciesList', SPECIES);
    this.stats = new StatsUpdater();

    this.init();
  }

  private init(): void {
    this.timeController.setDates(this.dates);
    this.pathRenderer.setDateList(this.dates);

    this.timeController.onUpdate((date) => {
      this.currentDate = date;
      this.updateVisualization();
    });

    this.sidebar.onChange((speciesId) => {
      this.currentSpecies = speciesId;
      this.switchSpecies(speciesId);
    });

    this.heatmap.onClick((data, screenPos, worldPos) => {
      this.infoPanel.show({ data, worldPosition: worldPos });
    });

    document.addEventListener('click', (e) => {
      const card = document.getElementById('infoCard');
      if (card && this.infoPanel.isVisible()) {
        if (card.contains(e.target as Node)) return;
        const target = e.target as HTMLElement;
        if (target.closest('.time-bar') || target.closest('.side-panel') || target.closest('.logo')) return;
        const canvas = this.sceneManager.renderer.domElement;
        if (canvas.contains(e.target as Node)) return;
        this.infoPanel.hide();
      }
    });

    this.updateVisualization();
    this.switchSpecies('all');
    this.sceneManager.start();
  }

  private switchSpecies(speciesId: string): void {
    const paths = speciesId === 'all'
      ? this.allPathData
      : this.allPathData.filter(p => p.speciesId === speciesId);

    this.pathRenderer.setSpecies(speciesId, paths);
    this.updateVisualization();
  }

  private updateVisualization(): void {
    const heatData = heatSeedsToData(this.heatSeeds, this.speciesMap, this.currentDate);
    this.heatmap.updateData(heatData, this.currentSpecies, this.currentDate);
    this.pathRenderer.updateCurrentDate(this.currentDate);

    const dateIdx = this.dates.indexOf(this.currentDate);
    const progress = this.dates.length > 1 ? dateIdx / (this.dates.length - 1) : 0;
    this.stats.update(heatData, this.currentSpecies, progress);

    const counts = new Map<string, number>();
    counts.set('all', heatData.length);
    for (const sp of SPECIES) counts.set(sp.id, 0);
    for (const p of heatData) {
      counts.set(p.speciesId, (counts.get(p.speciesId) || 0) + 1);
    }
    for (const [id, n] of counts) {
      this.sidebar.updateCount(id, n);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
