export interface ParticleInit {
  x: number;
  y: number;
  charge: number;
}

export interface TargetConfig {
  x: number;
  y: number;
}

export interface ObstacleConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  moving: boolean;
  speed: number;
  range: number;
  direction: number;
  originY: number;
}

export interface LevelConfig {
  particles: ParticleInit[];
  targets: TargetConfig[];
  obstacles: ObstacleConfig[];
  timeLimit: number;
}

function createObstacle(
  x: number, y: number, w: number, h: number,
  moving = false, speed = 0, range = 0
): ObstacleConfig {
  return { x, y, width: w, height: h, moving, speed, range, direction: 1, originY: y };
}

const levels: LevelConfig[] = [
  {
    particles: [
      { x: 100, y: 300, charge: 1 },
    ],
    targets: [
      { x: 650, y: 300 },
    ],
    obstacles: [
      createObstacle(350, 200, 20, 200),
    ],
    timeLimit: 120,
  },
  {
    particles: [
      { x: 100, y: 200, charge: 1 },
      { x: 100, y: 400, charge: -1 },
    ],
    targets: [
      { x: 650, y: 300 },
    ],
    obstacles: [
      createObstacle(300, 100, 20, 180),
      createObstacle(400, 320, 20, 180),
    ],
    timeLimit: 120,
  },
  {
    particles: [
      { x: 80, y: 150, charge: 1 },
      { x: 80, y: 300, charge: -1 },
      { x: 80, y: 450, charge: 1 },
    ],
    targets: [
      { x: 650, y: 150 },
      { x: 650, y: 450 },
    ],
    obstacles: [
      createObstacle(250, 50, 20, 200),
      createObstacle(350, 350, 20, 200),
      createObstacle(500, 150, 20, 150),
    ],
    timeLimit: 120,
  },
  {
    particles: [
      { x: 60, y: 100, charge: 1 },
      { x: 60, y: 250, charge: -1 },
      { x: 60, y: 400, charge: 1 },
      { x: 60, y: 520, charge: -1 },
    ],
    targets: [
      { x: 700, y: 150 },
      { x: 700, y: 450 },
    ],
    obstacles: [
      createObstacle(200, 50, 20, 160),
      createObstacle(300, 280, 20, 160),
      createObstacle(450, 120, 20, 180),
      createObstacle(550, 350, 20, 180),
    ],
    timeLimit: 120,
  },
  {
    particles: [
      { x: 50, y: 80, charge: 1 },
      { x: 50, y: 200, charge: -1 },
      { x: 50, y: 320, charge: 1 },
      { x: 50, y: 440, charge: -1 },
      { x: 150, y: 150, charge: 1 },
      { x: 150, y: 400, charge: -1 },
    ],
    targets: [
      { x: 700, y: 100 },
      { x: 700, y: 300 },
      { x: 700, y: 500 },
    ],
    obstacles: [
      createObstacle(250, 30, 20, 140, true, 40, 80),
      createObstacle(350, 250, 20, 140, true, 40, 80),
      createObstacle(450, 430, 20, 140, true, 40, 80),
      createObstacle(550, 100, 20, 120),
      createObstacle(550, 380, 20, 120),
    ],
    timeLimit: 120,
  },
];

export function getLevel(index: number): LevelConfig | null {
  if (index < 0 || index >= levels.length) return null;
  const level = levels[index];
  return {
    ...level,
    particles: level.particles.map(p => ({ ...p })),
    targets: level.targets.map(t => ({ ...t })),
    obstacles: level.obstacles.map(o => ({ ...o, originY: o.y })),
  };
}

export function getTotalLevels(): number {
  return levels.length;
}
