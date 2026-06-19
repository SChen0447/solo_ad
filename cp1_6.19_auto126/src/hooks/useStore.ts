import { create } from 'zustand';
import type { AppState, Building, SeasonType, WindRose, SectionPlane } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const createDefaultBuildings = (): Building[] => [
  {
    id: uuidv4(),
    name: '建筑 A',
    x: -15,
    z: -10,
    width: 12,
    depth: 10,
    height: 30,
    color: '#4a90d9',
    opacity: 0.9,
  },
  {
    id: uuidv4(),
    name: '建筑 B',
    x: 10,
    z: 5,
    width: 15,
    depth: 12,
    height: 45,
    color: '#7c68ef',
    opacity: 0.9,
  },
  {
    id: uuidv4(),
    name: '建筑 C',
    x: -5,
    z: 15,
    width: 10,
    depth: 10,
    height: 20,
    color: '#34d399',
    opacity: 0.9,
  },
];

const createSchemeABuildings = (): Building[] => [
  {
    id: uuidv4(),
    name: '主楼 A1',
    x: -15,
    z: -10,
    width: 12,
    depth: 10,
    height: 30,
    color: '#4a90d9',
    opacity: 0.9,
  },
  {
    id: uuidv4(),
    name: '副楼 A2',
    x: 10,
    z: 5,
    width: 10,
    depth: 8,
    height: 25,
    color: '#7c68ef',
    opacity: 0.9,
  },
  {
    id: uuidv4(),
    name: '裙楼 A3',
    x: -5,
    z: 15,
    width: 14,
    depth: 10,
    height: 15,
    color: '#34d399',
    opacity: 0.9,
  },
];

const createSchemeBBuildings = (): Building[] => [
  {
    id: uuidv4(),
    name: '主楼 B1',
    x: -10,
    z: -15,
    width: 16,
    depth: 14,
    height: 50,
    color: '#f59e0b',
    opacity: 0.9,
  },
  {
    id: uuidv4(),
    name: '副楼 B2',
    x: 15,
    z: 0,
    width: 12,
    depth: 10,
    height: 35,
    color: '#ef4444',
    opacity: 0.9,
  },
  {
    id: uuidv4(),
    name: '裙楼 B3',
    x: 0,
    z: 20,
    width: 20,
    depth: 12,
    height: 12,
    color: '#8b5cf6',
    opacity: 0.9,
  },
  {
    id: uuidv4(),
    name: '塔楼 B4',
    x: -20,
    z: 10,
    width: 8,
    depth: 8,
    height: 40,
    color: '#06b6d4',
    opacity: 0.9,
  },
];

const initialWindRose: WindRose = {
  direction: 315,
  speed: 5,
};

const initialSectionPlane: SectionPlane = {
  active: false,
  axis: 'x',
  position: 0,
};

export const useAppStore = create<AppState & {
  setCurrentScheme: (scheme: 'A' | 'B') => void;
  updateBuilding: (scheme: 'A' | 'B', buildingId: string, updates: Partial<Building>) => void;
  addBuilding: (scheme: 'A' | 'B', building: Omit<Building, 'id'>) => void;
  removeBuilding: (scheme: 'A' | 'B', buildingId: string) => void;
  setSunPosition: (season: SeasonType, time: number) => void;
  setWindRose: (windRose: WindRose) => void;
  setShowWindParticles: (show: boolean) => void;
  setSectionPlane: (sectionPlane: SectionPlane) => void;
  setSelectedBuildingId: (id: string | null) => void;
  setTransitionProgress: (progress: number) => void;
  updateSchemeMetrics: (scheme: 'A' | 'B') => void;
}>((set, get) => ({
  currentScheme: 'A',
  schemeA: {
    id: 'A',
    name: '方案 A',
    buildings: createSchemeABuildings(),
    metrics: {
      avgSunshineHours: 6.5,
      avgWindSpeed: 3.2,
    },
  },
  schemeB: {
    id: 'B',
    name: '方案 B',
    buildings: createSchemeBBuildings(),
    metrics: {
      avgSunshineHours: 5.2,
      avgWindSpeed: 4.1,
    },
  },
  sunPosition: {
    azimuth: 0,
    altitude: Math.PI / 4,
    season: 'summer',
    time: 12,
  },
  windRose: initialWindRose,
  showWindParticles: true,
  sectionPlane: initialSectionPlane,
  selectedBuildingId: null,
  transitionProgress: 1,

  setCurrentScheme: (scheme) => set({ currentScheme: scheme }),

  updateBuilding: (scheme, buildingId, updates) => {
    const schemeKey = scheme === 'A' ? 'schemeA' : 'schemeB';
    const currentScheme = get()[schemeKey];
    const updatedBuildings = currentScheme.buildings.map((b) =>
      b.id === buildingId ? { ...b, ...updates } : b
    );
    set({
      [schemeKey]: {
        ...currentScheme,
        buildings: updatedBuildings,
      },
    } as Partial<AppState>);
  },

  addBuilding: (scheme, building) => {
    const schemeKey = scheme === 'A' ? 'schemeA' : 'schemeB';
    const currentScheme = get()[schemeKey];
    const newBuilding = { ...building, id: uuidv4() };
    set({
      [schemeKey]: {
        ...currentScheme,
        buildings: [...currentScheme.buildings, newBuilding],
      },
    } as Partial<AppState>);
  },

  removeBuilding: (scheme, buildingId) => {
    const schemeKey = scheme === 'A' ? 'schemeA' : 'schemeB';
    const currentScheme = get()[schemeKey];
    const filteredBuildings = currentScheme.buildings.filter((b) => b.id !== buildingId);
    set({
      [schemeKey]: {
        ...currentScheme,
        buildings: filteredBuildings,
      },
    } as Partial<AppState>);
  },

  setSunPosition: (season, time) => {
    set({ sunPosition: { ...get().sunPosition, season, time } });
  },

  setWindRose: (windRose) => set({ windRose }),

  setShowWindParticles: (show) => set({ showWindParticles: show }),

  setSectionPlane: (sectionPlane) => set({ sectionPlane }),

  setSelectedBuildingId: (id) => set({ selectedBuildingId: id }),

  setTransitionProgress: (progress) => set({ transitionProgress: progress }),

  updateSchemeMetrics: (scheme) => {
  },
}));
