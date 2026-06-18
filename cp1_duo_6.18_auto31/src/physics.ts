import type { Wall, SoundWave, Receiver } from './store';
import { CONSTANTS } from './store';

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface IntersectionResult {
  intersects: boolean;
  x: number;
  y: number;
  t: number;
  u: number;
  wallIndex: number;
}

export function lineIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { intersects: boolean; x: number; y: number; t: number; u: number } {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) {
    return { intersects: false, x: 0, y: 0, t: 0, u: 0 };
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      intersects: true,
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
      t,
      u,
    };
  }

  return { intersects: false, x: 0, y: 0, t, u };
}

export function findNearestWallIntersection(
  waveX: number, waveY: number,
  nextX: number, nextY: number,
  walls: Wall[]
): IntersectionResult | null {
  let nearest: IntersectionResult | null = null;
  let minT = Infinity;

  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i];
    const result = lineIntersection(
      waveX, waveY, nextX, nextY,
      wall.x1, wall.y1, wall.x2, wall.y2
    );

    if (result.intersects && result.t < minT && result.t > 0.001) {
      minT = result.t;
      nearest = { ...result, wallIndex: i };
    }
  }

  return nearest;
}

export function calculateReflection(
  incomingAngle: number,
  wall: Wall
): number {
  const wallDx = wall.x2 - wall.x1;
  const wallDy = wall.y2 - wall.y1;
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
  
  if (wallLength < 0.001) return incomingAngle;

  const wallTangentX = wallDx / wallLength;
  const wallTangentY = wallDy / wallLength;
  const wallNormalX = -wallTangentY;
  const wallNormalY = wallTangentX;

  const incomingX = Math.cos(incomingAngle);
  const incomingY = Math.sin(incomingAngle);

  const dotProduct = incomingX * wallNormalX + incomingY * wallNormalY;
  const reflectedX = incomingX - 2 * dotProduct * wallNormalX;
  const reflectedY = incomingY - 2 * dotProduct * wallNormalY;

  return Math.atan2(reflectedY, reflectedX);
}

export function checkReceiverCollision(
  waveX: number, waveY: number,
  prevX: number, prevY: number,
  receivers: Receiver[]
): { receiverId: number; distance: number } | null {
  for (const receiver of receivers) {
    const dist = pointToLineDistance(
      receiver.x, receiver.y,
      prevX, prevY, waveX, waveY
    );
    if (dist <= CONSTANTS.RECEIVER_RADIUS + 2) {
      const directDist = Math.sqrt(
        (waveX - receiver.x) ** 2 + (waveY - receiver.y) ** 2
      );
      return { receiverId: receiver.id, distance: directDist };
    }
  }
  return null;
}

function pointToLineDistance(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface PropagationResult {
  wave: SoundWave;
  reflected: boolean;
  reflectionPoint?: { x: number; y: number };
  newAngle?: number;
  hitReceiver?: { receiverId: number; intensity: number };
  dead: boolean;
}

export function propagateWave(
  wave: SoundWave,
  walls: Wall[],
  receivers: Receiver[],
  mazeSize: number
): PropagationResult {
  const result: PropagationResult = {
    wave: { ...wave },
    reflected: false,
    dead: false,
  };

  result.wave.prevX = wave.x;
  result.wave.prevY = wave.y;

  let nextX = wave.x + Math.cos(wave.angle) * CONSTANTS.WAVE_SPEED;
  let nextY = wave.y + Math.sin(wave.angle) * CONSTANTS.WAVE_SPEED;

  if (nextX < 0 || nextX > mazeSize || nextY < 0 || nextY > mazeSize) {
    result.dead = true;
    return result;
  }

  const intersection = findNearestWallIntersection(
    wave.x, wave.y, nextX, nextY, walls
  );

  if (intersection) {
    result.reflected = true;
    result.reflectionPoint = { x: intersection.x, y: intersection.y };
    
    const wall = walls[intersection.wallIndex];
    result.newAngle = calculateReflection(wave.angle, wall);
    
    result.wave.x = intersection.x;
    result.wave.y = intersection.y;
    result.wave.angle = result.newAngle;
    result.wave.reflections += 1;
  } else {
    result.wave.x = nextX;
    result.wave.y = nextY;
  }

  result.wave.intensity *= CONSTANTS.WAVE_DECAY;
  result.wave.age += 1;

  if (result.wave.intensity < 0.01) {
    result.dead = true;
    return result;
  }

  const receiverHit = checkReceiverCollision(
    result.wave.x, result.wave.y,
    result.wave.prevX, result.wave.prevY,
    receivers
  );

  if (receiverHit) {
    const intensityContribution = result.wave.intensity * 
      Math.max(0, 1 - receiverHit.distance / (CONSTANTS.RECEIVER_RADIUS * 2));
    result.hitReceiver = {
      receiverId: receiverHit.receiverId,
      intensity: intensityContribution,
    };
  }

  if (result.wave.age > result.wave.maxAge) {
    result.dead = true;
  }

  return result;
}

export interface SimulationResult {
  updatedWaves: SoundWave[];
  reflectionPoints: { x: number; y: number }[];
  receiverUpdates: { id: number; intensityAdd: number }[];
}

export function simulateFrame(
  waves: SoundWave[],
  walls: Wall[],
  receivers: Receiver[],
  mazeSize: number
): SimulationResult {
  const updatedWaves: SoundWave[] = [];
  const reflectionPoints: { x: number; y: number }[] = [];
  const receiverUpdates: Map<number, number> = new Map();

  for (const wave of waves) {
    const result = propagateWave(wave, walls, receivers, mazeSize);

    if (result.dead) continue;

    updatedWaves.push(result.wave);

    if (result.reflected && result.reflectionPoint) {
      reflectionPoints.push(result.reflectionPoint);
    }

    if (result.hitReceiver) {
      const current = receiverUpdates.get(result.hitReceiver.receiverId) || 0;
      receiverUpdates.set(
        result.hitReceiver.receiverId,
        current + result.hitReceiver.intensity
      );
    }
  }

  return {
    updatedWaves,
    reflectionPoints,
    receiverUpdates: Array.from(receiverUpdates.entries()).map(([id, intensityAdd]) => ({
      id,
      intensityAdd,
    })),
  };
}

export function generateWavesFromSource(
  sourceX: number,
  sourceY: number,
  wavesPerDirection: number = CONSTANTS.WAVES_PER_DIRECTION
): Omit<SoundWave, 'id'>[] {
  const newWaves: Omit<SoundWave, 'id'>[] = [];
  const directions = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const halfSector = Math.PI / 4;

  for (const dir of directions) {
    for (let i = 0; i < wavesPerDirection; i++) {
      const offset = (i / (wavesPerDirection - 1) - 0.5) * 2 * halfSector;
      const angle = dir + offset;
      
      newWaves.push({
        x: sourceX,
        y: sourceY,
        prevX: sourceX,
        prevY: sourceY,
        angle,
        intensity: 1,
        age: 0,
        maxAge: 500,
        reflections: 0,
      });
    }
  }

  return newWaves;
}

export function getIntensityColor(intensity: number): string {
  const clampedIntensity = Math.max(0, Math.min(1, intensity));
  const r = Math.round(139 * (1 - clampedIntensity));
  const g = Math.round(0 * (1 - clampedIntensity) + 255 * clampedIntensity);
  const b = 0;
  return `rgb(${r}, ${g}, ${b})`;
}

export function isPointOnWall(
  px: number, py: number,
  wall: Wall,
  threshold: number = CONSTANTS.WALL_THICKNESS
): boolean {
  const dist = pointToLineDistance(
    px, py, wall.x1, wall.y1, wall.x2, wall.y2
  );
  
  const minX = Math.min(wall.x1, wall.x2) - threshold;
  const maxX = Math.max(wall.x1, wall.x2) + threshold;
  const minY = Math.min(wall.y1, wall.y2) - threshold;
  const maxY = Math.max(wall.y1, wall.y2) + threshold;
  
  return dist <= threshold && px >= minX && px <= maxX && py >= minY && py <= maxY;
}

export function findWallAtPoint(
  px: number, py: number,
  walls: Wall[],
  threshold: number = CONSTANTS.WALL_THICKNESS
): number {
  for (let i = walls.length - 1; i >= 0; i--) {
    if (isPointOnWall(px, py, walls[i], threshold)) {
      return i;
    }
  }
  return -1;
}
