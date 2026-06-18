import type { Wall, SoundWave, Receiver } from './store';
import { CONSTANTS } from './store';

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

  let xx: number, yy: number;

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

export interface PropagationResult {
  wave: SoundWave;
  reflected: boolean;
  reflectionPoint?: { x: number; y: number };
  dead: boolean;
  traveledDistance: number;
}

export function propagateWave(
  wave: SoundWave,
  walls: Wall[],
  mazeSize: number
): PropagationResult {
  const result: PropagationResult = {
    wave: { ...wave },
    reflected: false,
    dead: false,
    traveledDistance: 0,
  };

  result.wave.prevX = wave.x;
  result.wave.prevY = wave.y;

  let remainingDistance: number = CONSTANTS.WAVE_SPEED;
  let currentX = wave.x;
  let currentY = wave.y;
  let currentAngle = wave.angle;
  let totalReflections = 0;
  let totalTraveled = 0;

  const maxIterations = 5;
  for (let i = 0; i < maxIterations && remainingDistance > 0.01; i++) {
    const nextX = currentX + Math.cos(currentAngle) * remainingDistance;
    const nextY = currentY + Math.sin(currentAngle) * remainingDistance;

    if (nextX < 0 || nextX > mazeSize || nextY < 0 || nextY > mazeSize) {
      result.dead = true;
      result.wave.x = nextX;
      result.wave.y = nextY;
      result.traveledDistance = totalTraveled + remainingDistance;
      return result;
    }

    const intersection = findNearestWallIntersection(
      currentX, currentY, nextX, nextY, walls
    );

    if (intersection) {
      const distToIntersection = Math.sqrt(
        (intersection.x - currentX) ** 2 + (intersection.y - currentY) ** 2
      );
      
      totalTraveled += distToIntersection;
      remainingDistance -= distToIntersection;
      
      const wall = walls[intersection.wallIndex];
      currentAngle = calculateReflection(currentAngle, wall);
      currentX = intersection.x;
      currentY = intersection.y;
      totalReflections++;

      if (!result.reflected) {
        result.reflected = true;
        result.reflectionPoint = { x: intersection.x, y: intersection.y };
      }
    } else {
      totalTraveled += remainingDistance;
      currentX = nextX;
      currentY = nextY;
      remainingDistance = 0;
    }
  }

  result.wave.x = currentX;
  result.wave.y = currentY;
  result.wave.angle = currentAngle;
  result.wave.reflections += totalReflections;
  result.traveledDistance = totalTraveled;

  const distanceDecay = Math.pow(CONSTANTS.WAVE_DECAY, totalTraveled / CONSTANTS.WAVE_SPEED);
  const reflectionDecay = Math.pow(0.9, totalReflections);
  result.wave.intensity = wave.intensity * distanceDecay * reflectionDecay;

  result.wave.age += 1;

  if (result.wave.intensity < 0.01) {
    result.dead = true;
  }

  if (result.wave.age > result.wave.maxAge) {
    result.dead = true;
  }

  return result;
}

export function calculateReceiverIntensity(
  receivers: Receiver[],
  waves: SoundWave[]
): Map<number, number> {
  const intensities = new Map<number, number>();

  for (const receiver of receivers) {
    let totalIntensity = 0;

    for (const wave of waves) {
      const dist = pointToLineDistance(
        receiver.x, receiver.y,
        wave.prevX, wave.prevY, wave.x, wave.y
      );

      if (dist < CONSTANTS.RECEIVER_RADIUS * 3) {
        const waveDist = Math.sqrt(
          (wave.x - receiver.x) ** 2 + (wave.y - receiver.y) ** 2
        );
        
        if (waveDist < CONSTANTS.RECEIVER_RADIUS * 3) {
          const normalizedDist = dist / CONSTANTS.RECEIVER_RADIUS;
          const contribution = wave.intensity * Math.max(0, 1 - normalizedDist * 0.5);
          totalIntensity += contribution;
        }
      }
    }

    intensities.set(receiver.id, Math.min(1, totalIntensity));
  }

  return intensities;
}

export interface SimulationResult {
  updatedWaves: SoundWave[];
  reflectionPoints: { x: number; y: number }[];
  receiverIntensities: Map<number, number>;
}

export function simulateFrame(
  waves: SoundWave[],
  walls: Wall[],
  receivers: Receiver[],
  mazeSize: number
): SimulationResult {
  const updatedWaves: SoundWave[] = [];
  const reflectionPoints: { x: number; y: number }[] = [];

  for (const wave of waves) {
    const result = propagateWave(wave, walls, mazeSize);

    if (result.dead) continue;

    updatedWaves.push(result.wave);

    if (result.reflected && result.reflectionPoint) {
      reflectionPoints.push(result.reflectionPoint);
    }
  }

  const receiverIntensities = calculateReceiverIntensity(receivers, updatedWaves);

  return {
    updatedWaves,
    reflectionPoints,
    receiverIntensities,
  };
}

export function generateFanWavesFromSource(
  sourceX: number,
  sourceY: number,
  raysPerDirection: number = CONSTANTS.WAVES_PER_DIRECTION
): Omit<SoundWave, 'id'>[] {
  const newWaves: Omit<SoundWave, 'id'>[] = [];
  const directions = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const halfSpread = (15 * Math.PI) / 180;

  for (let dirIdx = 0; dirIdx < directions.length; dirIdx++) {
    const dir = directions[dirIdx];
    const rayCount = Math.max(3, raysPerDirection);
    
    for (let i = 0; i < rayCount; i++) {
      const offset = rayCount === 1
        ? 0
        : (i / (rayCount - 1) - 0.5) * 2 * halfSpread;
      const angle = dir + offset;
      
      newWaves.push({
        x: sourceX,
        y: sourceY,
        prevX: sourceX,
        prevY: sourceY,
        angle,
        originAngle: angle,
        fanDirIndex: dirIdx,
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

export function getWaveColor(wave: SoundWave): { r: number; g: number; b: number; a: number } {
  const intensity = Math.max(0, Math.min(1, wave.intensity));
  const r = Math.floor(100 * (1 - intensity) + 100);
  const g = Math.floor(149 * intensity) + 100;
  const b = Math.floor(237);
  const a = Math.min(1, intensity * 2) * 0.6;
  return { r, g, b, a };
}
