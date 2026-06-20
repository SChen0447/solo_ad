export interface WallConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  frequencyMin: number;
  frequencyMax: number;
  moveAxis: 'y';
  moveRange: number;
  originalY?: number;
}

export interface DoorConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  frequencyMin: number;
  frequencyMax: number;
  volumeThreshold: number;
}

export interface BlockConfig {
  x: number;
  y: number;
  size: number;
}

export interface LevelConfig {
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  platforms: PlatformConfig[];
  doors: DoorConfig[];
  blocks: BlockConfig[];
  walls: WallConfig[];
  goal: { x: number; y: number };
}

export const levels: LevelConfig[] = [
  {
    width: 1920,
    height: 1080,
    playerStart: { x: 100, y: 900 },
    goal: { x: 1750, y: 350 },
    walls: [
      { x: 0, y: 0, width: 20, height: 1080 },
      { x: 1900, y: 0, width: 20, height: 1080 },
      { x: 0, y: 980, width: 1920, height: 100 },
      { x: 0, y: 0, width: 1920, height: 20 }
    ],
    platforms: [
      {
        x: 300, y: 850, width: 200, height: 20,
        frequencyMin: 200, frequencyMax: 400,
        moveAxis: 'y', moveRange: 300, originalY: 850
      },
      {
        x: 700, y: 750, width: 200, height: 20,
        frequencyMin: 200, frequencyMax: 400,
        moveAxis: 'y', moveRange: 250, originalY: 750
      },
      { x: 100, y: 900, width: 250, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 900 },
      { x: 500, y: 600, width: 200, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 600 },
      { x: 900, y: 500, width: 250, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 500 },
      { x: 1200, y: 400, width: 200, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 400 },
      { x: 1500, y: 500, width: 200, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 500 },
      { x: 1600, y: 380, width: 250, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 380 }
    ],
    doors: [
      {
        x: 850, y: 440, width: 25, height: 100,
        frequencyMin: 250, frequencyMax: 450,
        volumeThreshold: 0.6
      }
    ],
    blocks: [
      { x: 600, y: 560, size: 40 }
    ]
  },
  {
    width: 1920,
    height: 1080,
    playerStart: { x: 100, y: 900 },
    goal: { x: 1750, y: 200 },
    walls: [
      { x: 0, y: 0, width: 20, height: 1080 },
      { x: 1900, y: 0, width: 20, height: 1080 },
      { x: 0, y: 980, width: 1920, height: 100 },
      { x: 0, y: 0, width: 1920, height: 20 },
      { x: 600, y: 300, width: 20, height: 400 },
      { x: 1200, y: 200, width: 20, height: 500 }
    ],
    platforms: [
      {
        x: 200, y: 800, width: 200, height: 20,
        frequencyMin: 200, frequencyMax: 400,
        moveAxis: 'y', moveRange: 350, originalY: 800
      },
      {
        x: 650, y: 700, width: 200, height: 20,
        frequencyMin: 300, frequencyMax: 500,
        moveAxis: 'y', moveRange: 300, originalY: 700
      },
      {
        x: 1250, y: 600, width: 200, height: 20,
        frequencyMin: 200, frequencyMax: 400,
        moveAxis: 'y', moveRange: 350, originalY: 600
      },
      { x: 100, y: 900, width: 200, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 900 },
      { x: 400, y: 650, width: 180, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 650 },
      { x: 850, y: 500, width: 200, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 500 },
      { x: 950, y: 350, width: 200, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 350 },
      { x: 1400, y: 300, width: 200, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 300 },
      { x: 1600, y: 230, width: 250, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 230 }
    ],
    doors: [
      {
        x: 600, y: 600, width: 25, height: 100,
        frequencyMin: 250, frequencyMax: 450,
        volumeThreshold: 0.6
      },
      {
        x: 1200, y: 350, width: 25, height: 100,
        frequencyMin: 300, frequencyMax: 500,
        volumeThreshold: 0.5
      }
    ],
    blocks: [
      { x: 450, y: 610, size: 40 },
      { x: 1300, y: 260, size: 40 }
    ]
  },
  {
    width: 1920,
    height: 1080,
    playerStart: { x: 100, y: 900 },
    goal: { x: 1750, y: 150 },
    walls: [
      { x: 0, y: 0, width: 20, height: 1080 },
      { x: 1900, y: 0, width: 20, height: 1080 },
      { x: 0, y: 980, width: 1920, height: 100 },
      { x: 0, y: 0, width: 1920, height: 20 },
      { x: 500, y: 200, width: 20, height: 500 },
      { x: 900, y: 100, width: 20, height: 600 },
      { x: 1400, y: 150, width: 20, height: 500 }
    ],
    platforms: [
      {
        x: 150, y: 800, width: 200, height: 20,
        frequencyMin: 200, frequencyMax: 350,
        moveAxis: 'y', moveRange: 400, originalY: 800
      },
      {
        x: 550, y: 700, width: 200, height: 20,
        frequencyMin: 300, frequencyMax: 500,
        moveAxis: 'y', moveRange: 350, originalY: 700
      },
      {
        x: 950, y: 600, width: 200, height: 20,
        frequencyMin: 200, frequencyMax: 400,
        moveAxis: 'y', moveRange: 350, originalY: 600
      },
      {
        x: 1450, y: 500, width: 200, height: 20,
        frequencyMin: 350, frequencyMax: 550,
        moveAxis: 'y', moveRange: 300, originalY: 500
      },
      { x: 100, y: 900, width: 200, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 900 },
      { x: 300, y: 550, width: 180, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 550 },
      { x: 700, y: 400, width: 180, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 400 },
      { x: 1100, y: 350, width: 180, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 350 },
      { x: 1600, y: 250, width: 180, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 250 },
      { x: 1650, y: 180, width: 200, height: 20, frequencyMin: 0, frequencyMax: 0, moveAxis: 'y', moveRange: 0, originalY: 180 }
    ],
    doors: [
      {
        x: 500, y: 500, width: 25, height: 100,
        frequencyMin: 250, frequencyMax: 400,
        volumeThreshold: 0.6
      },
      {
        x: 900, y: 400, width: 25, height: 100,
        frequencyMin: 300, frequencyMax: 500,
        volumeThreshold: 0.5
      },
      {
        x: 1400, y: 300, width: 25, height: 100,
        frequencyMin: 350, frequencyMax: 550,
        volumeThreshold: 0.6
      }
    ],
    blocks: [
      { x: 350, y: 510, size: 40 },
      { x: 750, y: 360, size: 40 },
      { x: 1150, y: 310, size: 40 }
    ]
  }
];
