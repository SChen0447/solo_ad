import type { LevelData } from '../types';

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: '第1关：初识与门',
    description: '使用一个与门连接两个开关，当两个开关都打开时灯才会亮',
    switches: [
      { id: 'sw1', position: { x: 60, y: 120 }, state: false, isFixed: true },
      { id: 'sw2', position: { x: 60, y: 280 }, state: false, isFixed: true },
    ],
    lights: [
      { id: 'light1', position: { x: 720, y: 200 }, isFixed: true },
    ],
    fixedGates: [],
    availableGates: [{ type: 'AND', count: 1 }],
    gridSize: { width: 800, height: 600 },
    cellSize: 40,
  },
  {
    id: 2,
    name: '第2关：或门初探',
    description: '使用一个或门，只要有一个开关打开灯就会亮',
    switches: [
      { id: 'sw1', position: { x: 60, y: 120 }, state: false, isFixed: true },
      { id: 'sw2', position: { x: 60, y: 280 }, state: false, isFixed: true },
    ],
    lights: [
      { id: 'light1', position: { x: 720, y: 200 }, isFixed: true },
    ],
    fixedGates: [],
    availableGates: [{ type: 'OR', count: 1 }],
    gridSize: { width: 800, height: 600 },
    cellSize: 40,
  },
  {
    id: 3,
    name: '第3关：非门反转',
    description: '使用一个非门，开关打开时灯灭，开关关闭时灯亮',
    switches: [
      { id: 'sw1', position: { x: 60, y: 200 }, state: false, isFixed: true },
    ],
    lights: [
      { id: 'light1', position: { x: 720, y: 200 }, isFixed: true },
    ],
    fixedGates: [],
    availableGates: [{ type: 'NOT', count: 1 }],
    gridSize: { width: 800, height: 600 },
    cellSize: 40,
  },
  {
    id: 4,
    name: '第4关：组合逻辑',
    description: '使用与门和或门，三个开关中至少两个打开时灯亮',
    switches: [
      { id: 'sw1', position: { x: 60, y: 80 }, state: false, isFixed: true },
      { id: 'sw2', position: { x: 60, y: 220 }, state: false, isFixed: true },
      { id: 'sw3', position: { x: 60, y: 360 }, state: false, isFixed: true },
    ],
    lights: [
      { id: 'light1', position: { x: 720, y: 220 }, isFixed: true },
    ],
    fixedGates: [],
    availableGates: [
      { type: 'AND', count: 2 },
      { type: 'OR', count: 1 },
    ],
    gridSize: { width: 800, height: 600 },
    cellSize: 40,
  },
  {
    id: 5,
    name: '第5关：复杂电路',
    description: '组合两个与门、一个或门和一个非门，四个开关控制一盏灯',
    switches: [
      { id: 'sw1', position: { x: 60, y: 80 }, state: false, isFixed: true },
      { id: 'sw2', position: { x: 60, y: 200 }, state: false, isFixed: true },
      { id: 'sw3', position: { x: 60, y: 320 }, state: false, isFixed: true },
      { id: 'sw4', position: { x: 60, y: 440 }, state: false, isFixed: true },
    ],
    lights: [
      { id: 'light1', position: { x: 720, y: 260 }, isFixed: true },
    ],
    fixedGates: [],
    availableGates: [
      { type: 'AND', count: 2 },
      { type: 'OR', count: 1 },
      { type: 'NOT', count: 1 },
    ],
    gridSize: { width: 800, height: 600 },
    cellSize: 40,
  },
];

export function getLevelById(id: number): LevelData | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function getTotalLevels(): number {
  return LEVELS.length;
}
