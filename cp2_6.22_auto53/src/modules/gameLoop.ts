import type { ShipConfig } from './shipBuilder';
import { calculateShipStats } from './shipBuilder';
import { v4 as uuidv4 } from 'uuid';

export interface TrackSegment {
  x: number;
  width: number;
  curveAngle: number;
  curveDirection: 'left' | 'right' | 'straight';
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rock' | 'debris';
}

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'speed' | 'slow';
  collected: boolean;
}

export interface Ship {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  baseSpeed: number;
  currentSpeed: number;
  color: string;
  name: string;
  isPlayer: boolean;
  flashTimer: number;
  slowTimer: number;
  boostTimer: number;
  isAI: boolean;
  lane: number;
  targetLane: number;
  progress: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  maxSize: number;
  color: string;
}

export interface GameState {
  trackLength: number;
  trackSegments: TrackSegment[];
  obstacles: Obstacle[];
  powerUps: PowerUp[];
  ships: Ship[];
  particles: Particle[];
  cameraX: number;
  gameOver: boolean;
  winner: Ship | null;
  raceTime: number;
  started: boolean;
}

const TRACK_LENGTH = 10000;
const SEGMENT_WIDTH = 200;
const TRACK_Y = 400;
const TRACK_HEIGHT = 200;
const LANE_COUNT = 3;
const SHIP_WIDTH = 48;
const SHIP_HEIGHT = 32;

export function generateTrack(): { segments: TrackSegment[]; obstacles: Obstacle[]; powerUps: PowerUp[] } {
  const segments: TrackSegment[] = [];
  const obstacles: Obstacle[] = [];
  const powerUps: PowerUp[] = [];

  const numSegments = Math.ceil(TRACK_LENGTH / SEGMENT_WIDTH);
  
  for (let i = 0; i < numSegments; i++) {
    const x = i * SEGMENT_WIDTH;
    let curveDirection: 'left' | 'right' | 'straight' = 'straight';
    let curveAngle = 0;

    if (i > 2 && i < numSegments - 2 && Math.random() < 0.15) {
      curveDirection = Math.random() < 0.5 ? 'left' : 'right';
      curveAngle = 30 + Math.random() * 15;
    }

    segments.push({
      x,
      width: SEGMENT_WIDTH,
      curveAngle,
      curveDirection
    });

    if (i > 1 && i < numSegments - 1) {
      if (Math.random() < 0.3) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const laneY = getLaneY(lane);
        obstacles.push({
          id: uuidv4(),
          x: x + Math.random() * SEGMENT_WIDTH,
          y: laneY - 32,
          width: 64,
          height: 64,
          type: Math.random() < 0.5 ? 'rock' : 'debris'
        });
      }
    }
  }

  let lastPowerUpX = 0;
  for (let x = 500; x < TRACK_LENGTH - 500; ) {
    const gap = 300 + Math.random() * 500;
    x += gap;
    
    if (x - lastPowerUpX < 300) continue;
    lastPowerUpX = x;

    const lane = Math.floor(Math.random() * LANE_COUNT);
    const laneY = getLaneY(lane);
    const type = Math.random() < 0.6 ? 'speed' : 'slow';

    powerUps.push({
      id: uuidv4(),
      x,
      y: laneY - 24,
      width: 48,
      height: 48,
      type,
      collected: false
    });
  }

  return { segments, obstacles, powerUps };
}

function getLaneY(lane: number): number {
  const laneHeight = TRACK_HEIGHT / LANE_COUNT;
  return TRACK_Y + lane * laneHeight + laneHeight / 2;
}

export function createPlayerShip(config: ShipConfig): Ship {
  const stats = calculateShipStats(config);
  const baseSpeed = 3 + (stats.speed / 100) * 4;

  return {
    id: 'player',
    x: 100,
    y: getLaneY(1),
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    speed: baseSpeed,
    baseSpeed,
    currentSpeed: baseSpeed,
    color: '#60A5FA',
    name: '玩家',
    isPlayer: true,
    flashTimer: 0,
    slowTimer: 0,
    boostTimer: 0,
    isAI: false,
    lane: 1,
    targetLane: 1,
    progress: 0
  };
}

export function createAIShip(id: string, name: string, color: string, difficulty: number): Ship {
  const baseSpeed = 4 + difficulty * 1.5;

  return {
    id,
    x: 100 - Math.random() * 50,
    y: getLaneY(Math.floor(Math.random() * LANE_COUNT)),
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    speed: baseSpeed,
    baseSpeed,
    currentSpeed: baseSpeed,
    color,
    name,
    isPlayer: false,
    flashTimer: 0,
    slowTimer: 0,
    boostTimer: 0,
    isAI: true,
    lane: Math.floor(Math.random() * LANE_COUNT),
    targetLane: Math.floor(Math.random() * LANE_COUNT),
    progress: 0
  };
}

export function initGame(playerConfig: ShipConfig, aiShips: Ship[]): GameState {
  const { segments, obstacles, powerUps } = generateTrack();
  const player = createPlayerShip(playerConfig);

  return {
    trackLength: TRACK_LENGTH,
    trackSegments: segments,
    obstacles,
    powerUps,
    ships: [player, ...aiShips],
    particles: [],
    cameraX: 0,
    gameOver: false,
    winner: null,
    raceTime: 0,
    started: false
  };
}

export function movePlayer(state: GameState, direction: 'up' | 'down'): GameState {
  const player = state.ships.find(s => s.isPlayer);
  if (!player) return state;

  if (direction === 'up' && player.lane > 0) {
    player.targetLane = player.lane - 1;
  } else if (direction === 'down' && player.lane < LANE_COUNT - 1) {
    player.targetLane = player.lane + 1;
  }

  return { ...state };
}

function checkCollision(ship: Ship, obj: { x: number; y: number; width: number; height: number }): boolean {
  return (
    ship.x < obj.x + obj.width &&
    ship.x + ship.width > obj.x &&
    ship.y - ship.height / 2 < obj.y + obj.height &&
    ship.y + ship.height / 2 > obj.y
  );
}

function addBoostParticles(state: GameState, ship: Ship): void {
  for (let i = 0; i < 30; i++) {
    const particle: Particle = {
      id: uuidv4(),
      x: ship.x - 10,
      y: ship.y + (Math.random() - 0.5) * 20,
      vx: -2 - Math.random() * 3,
      vy: (Math.random() - 0.5) * 2,
      life: 0.6,
      maxLife: 0.6,
      size: 8,
      maxSize: 8,
      color: Math.random() < 0.5 ? '#ED8936' : '#F6AD55'
    };
    state.particles.push(particle);
  }
}

function addFireworkParticles(state: GameState, x: number, y: number): void {
  const colors = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981'];
  for (let i = 0; i < 200; i++) {
    const angle = (Math.PI * 2 * i) / 200 + Math.random() * 0.3;
    const speed = 2 + Math.random() * 6;
    const particle: Particle = {
      id: uuidv4(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 2.5,
      maxLife: 2.5,
      size: 4 + Math.random() * 3,
      maxSize: 7,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    state.particles.push(particle);
  }
}

function updateAI(ship: Ship, state: GameState, deltaTime: number, accuracy: number): void {
  const nearbyObstacles = state.obstacles.filter(
    o => o.x > ship.x - 100 && o.x < ship.x + 300
  );

  const obstacleLanes = new Set<number>();
  for (const obs of nearbyObstacles) {
    const obsLane = Math.floor(((obs.y + obs.height / 2) - TRACK_Y) / (TRACK_HEIGHT / LANE_COUNT));
    if (obsLane >= 0 && obsLane < LANE_COUNT && obs.x > ship.x && obs.x < ship.x + 200) {
      obstacleLanes.add(obsLane);
    }
  }

  if (Math.random() < accuracy * 0.02) {
    if (obstacleLanes.has(ship.lane)) {
      const possibleLanes = [0, 1, 2].filter(l => !obstacleLanes.has(l));
      if (possibleLanes.length > 0) {
        ship.targetLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
      }
    } else if (Math.random() < 0.01) {
      ship.targetLane = Math.floor(Math.random() * LANE_COUNT);
    }
  }

  const targetY = getLaneY(ship.targetLane);
  const dy = targetY - ship.y;
  ship.y += dy * 0.1;

  const actualLane = Math.floor(((ship.y) - TRACK_Y) / (TRACK_HEIGHT / LANE_COUNT));
  if (Math.abs(ship.y - getLaneY(ship.targetLane)) < 5) {
    ship.lane = ship.targetLane;
  } else if (actualLane !== ship.lane && actualLane >= 0 && actualLane < LANE_COUNT) {
    ship.lane = actualLane;
  }
}

export function updateGame(state: GameState, deltaTime: number, aiDifficulties: number[] = [0.7, 0.8, 0.9]): GameState {
  if (state.gameOver || !state.started) return state;

  const newState = { ...state };
  newState.raceTime += deltaTime;

  for (const ship of newState.ships) {
    if (ship.isAI) {
      const aiIndex = newState.ships.filter(s => s.isAI).indexOf(ship);
      const accuracy = aiDifficulties[aiIndex] || 0.7;
      updateAI(ship, newState, deltaTime, accuracy);
    } else {
      const targetY = getLaneY(ship.targetLane);
      const dy = targetY - ship.y;
      ship.y += dy * 0.15;
      
      if (Math.abs(ship.y - getLaneY(ship.targetLane)) < 2) {
        ship.lane = ship.targetLane;
      }
    }

    let speed = ship.baseSpeed;
    
    if (ship.boostTimer > 0) {
      speed *= 1.5;
      ship.boostTimer -= deltaTime;
      if (Math.random() < 0.3) {
        addBoostParticles(newState, ship);
      }
    }
    
    if (ship.slowTimer > 0) {
      speed *= 0.5;
      ship.slowTimer -= deltaTime;
    }
    
    if (ship.flashTimer > 0) {
      ship.flashTimer -= deltaTime;
    }

    ship.currentSpeed = speed;
    ship.x += speed * deltaTime * 60;
    ship.progress = ship.x / newState.trackLength;

    if (ship.x >= newState.trackLength) {
      newState.gameOver = true;
      newState.winner = ship;
      addFireworkParticles(newState, 400, 300);
    }
  }

  for (const ship of newState.ships) {
    for (const obs of newState.obstacles) {
      if (checkCollision(ship, obs) && ship.flashTimer <= 0) {
        ship.flashTimer = 0.5;
        ship.slowTimer = 1;
      }
    }
  }

  for (const ship of newState.ships) {
    for (const powerUp of newState.powerUps) {
      if (!powerUp.collected && checkCollision(ship, powerUp)) {
        powerUp.collected = true;
        if (powerUp.type === 'speed') {
          ship.boostTimer = 3;
        } else {
          ship.slowTimer = 2;
        }
      }
    }
  }

  const player = newState.ships.find(s => s.isPlayer);
  if (player) {
    newState.cameraX = player.x - 200;
  }

  newState.particles = newState.particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= deltaTime;
    p.size = p.maxSize * (p.life / p.maxLife);
    return p.life > 0;
  });

  newState.ships.sort((a, b) => b.progress - a.progress);

  return newState;
}

export function getRankings(ships: Ship[]): { rank: number; ship: Ship }[] {
  const sorted = [...ships].sort((a, b) => b.progress - a.progress);
  return sorted.map((ship, index) => ({ rank: index + 1, ship }));
}

export function getTrackY(): number {
  return TRACK_Y;
}

export function getTrackHeight(): number {
  return TRACK_HEIGHT;
}

export function getLaneCount(): number {
  return LANE_COUNT;
}

export function getTrackLength(): number {
  return TRACK_LENGTH;
}
