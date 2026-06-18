import type { BuildingData } from '../types';

const COLORS = {
  coolGray: '#78909c',
  warmGray: '#90a4ae',
  beige: '#e8dcc8',
  lightBlueGreen: '#80cbc4',
  lightOrange: '#ffcc80',
};

export const buildingConfigs: BuildingData[] = [
  {
    id: 'building-1',
    name: '天际塔 A',
    shape: 'box',
    position: [-60, 0, -40],
    dimensions: { width: 20, depth: 20, height: 50 },
    color: COLORS.coolGray,
  },
  {
    id: 'building-2',
    name: '商业中心 B',
    shape: 'lShape',
    position: [30, 0, -50],
    dimensions: { width: 30, depth: 25, height: 35 },
    color: COLORS.warmGray,
  },
  {
    id: 'building-3',
    name: '文化艺术中心',
    shape: 'arch',
    position: [-20, 0, 30],
    dimensions: { width: 35, depth: 20, height: 25 },
    color: COLORS.beige,
  },
  {
    id: 'building-4',
    name: '科技研发楼',
    shape: 'box',
    position: [50, 0, 20],
    dimensions: { width: 18, depth: 18, height: 42 },
    color: COLORS.lightBlueGreen,
  },
  {
    id: 'building-5',
    name: '综合服务楼',
    shape: 'lShape',
    position: [-50, 0, 50],
    dimensions: { width: 28, depth: 22, height: 18 },
    color: COLORS.lightOrange,
  },
  {
    id: 'building-6',
    name: '观景塔',
    shape: 'box',
    position: [0, 0, 0],
    dimensions: { width: 12, depth: 12, height: 55 },
    color: COLORS.coolGray,
  },
];

export function getBuildings(): BuildingData[] {
  return buildingConfigs;
}

export function getBuildingById(id: string): BuildingData | undefined {
  return buildingConfigs.find((b) => b.id === id);
}
