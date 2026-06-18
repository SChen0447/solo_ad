export interface Vector2 {
  x: number;
  y: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Mirror {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  draggable: boolean;
  rotationAnimation: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  patrolStart: number;
  patrolEnd: number;
  speed: number;
  direction: number;
  alerted: boolean;
  alertTimer: number;
}

export type ObstacleType = 'pillar' | 'crystal' | 'slime';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
}

export interface Mechanism {
  id: number;
  x: number;
  y: number;
  radius: number;
  activated: boolean;
  rotationAngle: number;
  rotationSpeed: number;
  clickPlayed: boolean;
}

export interface EnergyCore {
  id: number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  glowPhase: number;
}

export interface Ladder {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  targetMechanismId: number;
}

export interface GlowMushroom {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  phase: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface LevelData {
  width: number;
  height: number;
  platforms: Platform[];
  mirrors: Mirror[];
  enemies: Enemy[];
  obstacles: Obstacle[];
  mechanisms: Mechanism[];
  energyCores: EnergyCore[];
  ladders: Ladder[];
  mushrooms: GlowMushroom[];
  playerStart: Vector2;
  totalExplorableArea: number;
}

export function createLevelData(): LevelData {
  const platforms: Platform[] = [
    { x: 0, y: 550, width: 1200, height: 50 },
    { x: 0, y: 0, width: 20, height: 600 },
    { x: 1180, y: 0, width: 20, height: 600 },
    { x: 0, y: 0, width: 1200, height: 20 },
    { x: 150, y: 450, width: 180, height: 20 },
    { x: 400, y: 380, width: 150, height: 20 },
    { x: 620, y: 320, width: 200, height: 20 },
    { x: 900, y: 400, width: 180, height: 20 },
    { x: 200, y: 280, width: 160, height: 20 },
    { x: 500, y: 200, width: 180, height: 20 },
    { x: 800, y: 150, width: 200, height: 20 },
    { x: 100, y: 150, width: 140, height: 20 },
  ];

  const mirrors: Mirror[] = [
    { id: 1, x: 300, y: 500, width: 60, height: 8, angle: -30, draggable: true, rotationAnimation: 0 },
    { id: 2, x: 550, y: 430, width: 60, height: 8, angle: 45, draggable: true, rotationAnimation: 0 },
    { id: 3, x: 750, y: 350, width: 60, height: 8, angle: -20, draggable: true, rotationAnimation: 0 },
    { id: 4, x: 450, y: 250, width: 60, height: 8, angle: 60, draggable: true, rotationAnimation: 0 },
  ];

  const enemies: Enemy[] = [
    { id: 1, x: 350, y: 520, width: 30, height: 30, patrolStart: 250, patrolEnd: 500, speed: 1.5, direction: 1, alerted: false, alertTimer: 0 },
    { id: 2, x: 700, y: 290, width: 30, height: 30, patrolStart: 650, patrolEnd: 800, speed: 1.2, direction: 1, alerted: false, alertTimer: 0 },
    { id: 3, x: 250, y: 250, width: 30, height: 30, patrolStart: 200, patrolEnd: 340, speed: 1.8, direction: -1, alerted: false, alertTimer: 0 },
  ];

  const obstacles: Obstacle[] = [
    { id: 1, type: 'pillar', x: 180, y: 500, width: 30, height: 50, health: 5, maxHealth: 5 },
    { id: 2, type: 'crystal', x: 480, y: 350, width: 25, height: 30, health: 1, maxHealth: 1 },
    { id: 3, type: 'slime', x: 600, y: 530, width: 80, height: 20, health: -1, maxHealth: -1 },
    { id: 4, type: 'pillar', x: 850, y: 370, width: 30, height: 30, health: 5, maxHealth: 5 },
    { id: 5, type: 'crystal', x: 280, y: 250, width: 25, height: 30, health: 1, maxHealth: 1 },
    { id: 6, type: 'slime', x: 150, y: 430, width: 60, height: 20, health: -1, maxHealth: -1 },
    { id: 7, type: 'pillar', x: 560, y: 170, width: 30, height: 30, health: 5, maxHealth: 5 },
  ];

  const mechanisms: Mechanism[] = [
    { id: 1, x: 1000, y: 200, radius: 25, activated: false, rotationAngle: 0, rotationSpeed: 0, clickPlayed: false },
    { id: 2, x: 120, y: 100, radius: 25, activated: false, rotationAngle: 0, rotationSpeed: 0, clickPlayed: false },
  ];

  const energyCores: EnergyCore[] = [
    { id: 1, x: 250, y: 420, radius: 12, collected: false, glowPhase: 0 },
    { id: 2, x: 700, y: 290, radius: 12, collected: false, glowPhase: Math.PI / 2 },
    { id: 3, x: 950, y: 120, radius: 12, collected: false, glowPhase: Math.PI },
    { id: 4, x: 150, y: 120, radius: 12, collected: false, glowPhase: Math.PI * 1.5 },
    { id: 5, x: 550, y: 170, radius: 12, collected: false, glowPhase: 0 },
  ];

  const ladders: Ladder[] = [
    { x: 1100, y: 150, width: 40, height: 250, active: false, targetMechanismId: 1 },
    { x: 50, y: 20, width: 40, height: 130, active: false, targetMechanismId: 2 },
  ];

  const mushrooms: GlowMushroom[] = [];
  for (let i = 0; i < 30; i++) {
    mushrooms.push({
      x: Math.random() * 1160 + 20,
      y: Math.random() * 500 + 50,
      radius: Math.random() * 4 + 2,
      intensity: Math.random() * 0.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
    });
  }

  return {
    width: 1200,
    height: 600,
    platforms,
    mirrors,
    enemies,
    obstacles,
    mechanisms,
    energyCores,
    ladders,
    mushrooms,
    playerStart: { x: 80, y: 500 },
    totalExplorableArea: 1200 * 600,
  };
}
