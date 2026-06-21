import type { Level, SoundPlatform, SoundDoor, PushableBlock } from '../types';

function createPlatform(
  id: string,
  x: number,
  y: number,
  minY: number,
  maxY: number,
  freqRange: [number, number] = [200, 400]
): SoundPlatform {
  return {
    id,
    type: 'platform',
    x,
    y,
    width: 200,
    height: 20,
    baseY: y,
    targetY: y,
    minY,
    maxY,
    speed: 100,
    activeFrequencyRange: freqRange,
    isActivated: false,
    activationPulse: 0
  };
}

function createDoor(
  id: string,
  x: number,
  y: number,
  freqRange: [number, number] = [400, 600]
): SoundDoor {
  return {
    id,
    type: 'door',
    x,
    y,
    width: 25,
    height: 100,
    isOpen: false,
    openProgress: 0,
    requiredVolume: 0.6,
    requiredFrequencyRange: freqRange,
    isActivated: false,
    activationPulse: 0
  };
}

function createBlock(id: string, x: number, y: number): PushableBlock {
  return {
    id,
    type: 'block',
    x,
    y,
    width: 40,
    height: 40,
    vx: 0,
    isActivated: false,
    activationPulse: 0
  };
}

export const levels: Level[] = [
  {
    id: 1,
    name: '第一关：声音初识',
    playerStart: { x: 100, y: 500 },
    goal: { x: 1150, y: 200, radius: 20 },
    platforms: [
      createPlatform('p1', 300, 450, 300, 550, [200, 400]),
      createPlatform('p2', 600, 400, 250, 500, [200, 400])
    ],
    doors: [
      createDoor('d1', 900, 300, [400, 600])
    ],
    blocks: [],
    walls: [
      { x: 0, y: 620, width: 1280, height: 100 },
      { x: 0, y: 0, width: 20, height: 720 },
      { x: 1260, y: 0, width: 20, height: 720 },
      { x: 900, y: 400, width: 25, height: 320 }
    ]
  },
  {
    id: 2,
    name: '第二关：组合机关',
    playerStart: { x: 100, y: 500 },
    goal: { x: 1150, y: 150, radius: 20 },
    platforms: [
      createPlatform('p1', 250, 480, 330, 580, [200, 400]),
      createPlatform('p2', 550, 430, 280, 480, [200, 400]),
      createPlatform('p3', 850, 380, 230, 430, [200, 400])
    ],
    doors: [
      createDoor('d1', 500, 520, [400, 600]),
      createDoor('d2', 800, 280, [600, 800])
    ],
    blocks: [
      createBlock('b1', 350, 580)
    ],
    walls: [
      { x: 0, y: 620, width: 1280, height: 100 },
      { x: 0, y: 0, width: 20, height: 720 },
      { x: 1260, y: 0, width: 20, height: 720 },
      { x: 500, y: 620, width: 25, height: 0 },
      { x: 800, y: 380, width: 25, height: 340 },
      { x: 1050, y: 250, width: 230, height: 20 }
    ]
  },
  {
    id: 3,
    name: '第三关：终极挑战',
    playerStart: { x: 100, y: 500 },
    goal: { x: 1150, y: 100, radius: 20 },
    platforms: [
      createPlatform('p1', 200, 500, 350, 550, [200, 400]),
      createPlatform('p2', 500, 450, 300, 500, [200, 400]),
      createPlatform('p3', 800, 400, 250, 450, [200, 400]),
      createPlatform('p4', 1000, 300, 150, 350, [300, 500])
    ],
    doors: [
      createDoor('d1', 450, 520, [400, 600]),
      createDoor('d2', 750, 420, [600, 800]),
      createDoor('d3', 950, 200, [500, 700])
    ],
    blocks: [
      createBlock('b1', 300, 580),
      createBlock('b2', 600, 580)
    ],
    walls: [
      { x: 0, y: 620, width: 1280, height: 100 },
      { x: 0, y: 0, width: 20, height: 720 },
      { x: 1260, y: 0, width: 20, height: 720 },
      { x: 450, y: 620, width: 25, height: 0 },
      { x: 750, y: 520, width: 25, height: 200 },
      { x: 950, y: 300, width: 25, height: 420 },
      { x: 1050, y: 200, width: 230, height: 20 }
    ]
  }
];

export function getLevel(id: number): Level | undefined {
  return levels.find(level => level.id === id);
}

export function getTotalLevels(): number {
  return levels.length;
}
