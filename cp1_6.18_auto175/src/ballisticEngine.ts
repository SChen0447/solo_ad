import {
  Coordinate,
  Obstacle,
  Character,
  BallisticResult,
  HitReason,
  GRID_WIDTH,
  GRID_HEIGHT,
  BULLET_HEIGHT,
} from './types';

const coordsEqual = (a: Coordinate, b: Coordinate): boolean => {
  return a.x === b.x && a.y === b.y;
};

const isInBounds = (pos: Coordinate): boolean => {
  return pos.x >= 0 && pos.x < GRID_WIDTH && pos.y >= 0 && pos.y < GRID_HEIGHT;
};

export const bresenhamLine = (
  start: Coordinate,
  end: Coordinate
): Coordinate[] => {
  const points: Coordinate[] = [];
  let x0 = start.x;
  let y0 = start.y;
  const x1 = end.x;
  const y1 = end.y;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  points.push({ x: x0, y: y0 });

  while (x0 !== x1 || y0 !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    points.push({ x: x0, y: y0 });
  }

  return points;
};

export const canBulletPass = (obstacle: Obstacle): boolean => {
  return BULLET_HEIGHT > obstacle.height;
};

const getObstacleAt = (
  obstacles: Obstacle[],
  pos: Coordinate
): Obstacle | undefined => {
  return obstacles.find((o) => coordsEqual(o.position, pos));
};

const getCharacterAt = (
  characters: Character[],
  pos: Coordinate,
  excludeId?: string
): Character | undefined => {
  return characters.find(
    (c) => coordsEqual(c.position, pos) && c.id !== excludeId
  );
};

type Direction = { dx: number; dy: number };

const getDirection = (from: Coordinate, to: Coordinate): Direction => {
  return {
    dx: to.x - from.x,
    dy: to.y - from.y,
  };
};

const reflectDirection = (
  dir: Direction,
  hitType: 'horizontal' | 'vertical' | 'both'
): Direction => {
  switch (hitType) {
    case 'horizontal':
      return { dx: dir.dx, dy: -dir.dy };
    case 'vertical':
      return { dx: -dir.dx, dy: dir.dy };
    case 'both':
      return { dx: -dir.dx, dy: -dir.dy };
  }
};

const extendToBoundary = (
  start: Coordinate,
  dir: Direction
): Coordinate => {
  if (dir.dx === 0 && dir.dy === 0) {
    return start;
  }

  let tMax = Infinity;

  if (dir.dx > 0) {
    tMax = Math.min(tMax, (GRID_WIDTH - 1 - start.x) / dir.dx);
  } else if (dir.dx < 0) {
    tMax = Math.min(tMax, -start.x / dir.dx);
  }

  if (dir.dy > 0) {
    tMax = Math.min(tMax, (GRID_HEIGHT - 1 - start.y) / dir.dy);
  } else if (dir.dy < 0) {
    tMax = Math.min(tMax, -start.y / dir.dy);
  }

  if (!isFinite(tMax) || tMax < 0) {
    return start;
  }

  return {
    x: Math.round(start.x + dir.dx * tMax),
    y: Math.round(start.y + dir.dy * tMax),
  };
};

const normalizeDir = (dir: Direction): Direction => {
  const len = Math.max(Math.abs(dir.dx), Math.abs(dir.dy));
  if (len === 0) return { dx: 0, dy: 0 };
  return {
    dx: dir.dx,
    dy: dir.dy,
  };
};

export const playBounceSound = (): void => {
  try {
    const AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext })
        .webkitAudioContext;
    const audioCtx = new AudioContext();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      800,
      audioCtx.currentTime + 0.08
    );

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + 0.08
    );

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.08);
  } catch {
    // Audio not supported
  }
};

interface BallisticInput {
  start: Coordinate;
  target: Coordinate;
  obstacles: Obstacle[];
  characters: Character[];
  shooterId: string;
  maxBounces: number;
}

export const calculateBallistic = (input: BallisticInput): BallisticResult => {
  const { start, target, obstacles, characters, shooterId, maxBounces } = input;

  const fullPath: Coordinate[] = [];
  const pathSegments: { start: Coordinate; end: Coordinate }[] = [];
  const bouncePoints: Coordinate[] = [];
  const obstaclesPassed: Obstacle[] = [];

  let currentStart = { ...start };
  let currentTarget = { ...target };
  let currentDir = normalizeDir(getDirection(start, target));
  let bouncesRemaining = maxBounces;
  let hitTarget: Character | null = null;
  let hitObstacle: Obstacle | null = null;
  let reason: HitReason = 'reached_end';

  const maxIterations = maxBounces + 1;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    if (currentDir.dx === 0 && currentDir.dy === 0) {
      reason = 'reached_end';
      break;
    }

    const segmentEnd = extendToBoundary(currentStart, currentDir);
    const linePath = bresenhamLine(currentStart, segmentEnd);

    pathSegments.push({ start: currentStart, end: segmentEnd });

    let segmentBlocked = false;

    for (let i = 1; i < linePath.length; i++) {
      const pos = linePath[i];

      if (!isInBounds(pos)) {
        reason = 'out_of_bounds';
        fullPath.push(pos);
        segmentBlocked = true;
        break;
      }

      fullPath.push(pos);

      const character = getCharacterAt(characters, pos, shooterId);
      if (character) {
        hitTarget = character;
        reason = 'target_hit';
        segmentBlocked = true;
        break;
      }

      const obstacle = getObstacleAt(obstacles, pos);
      if (obstacle) {
        if (!obstaclesPassed.some((o) => o.id === obstacle.id)) {
          obstaclesPassed.push(obstacle);
        }

        if (canBulletPass(obstacle)) {
          continue;
        } else {
          hitObstacle = obstacle;

          if (bouncesRemaining > 0) {
            bouncesRemaining--;
            bouncePoints.push(pos);

            const prevPos = linePath[i - 1];
            let hitType: 'horizontal' | 'vertical' | 'both';
            const dxSign = Math.sign(currentDir.dx);
            const dySign = Math.sign(currentDir.dy);

            if (prevPos.x === pos.x) {
              hitType = 'horizontal';
            } else if (prevPos.y === pos.y) {
              hitType = 'vertical';
            } else {
              if (dxSign !== 0 && dySign !== 0) {
                hitType = 'both';
              } else if (dxSign !== 0) {
                hitType = 'vertical';
              } else {
                hitType = 'horizontal';
              }
            }

            currentDir = normalizeDir(reflectDirection(currentDir, hitType));

            const nextStart = pos;
            const nextTarget = extendToBoundary(nextStart, currentDir);
            currentStart = nextStart;
            currentTarget = nextTarget;
            segmentBlocked = true;
            break;
          } else {
            reason = 'no_bounce_left';
            segmentBlocked = true;
            break;
          }
        }
      }
    }

    if (!segmentBlocked) {
      reason = 'reached_end';
      break;
    }

    if (hitTarget || reason === 'out_of_bounds') {
      break;
    }
  }

  const endPoint =
    fullPath.length > 0 ? fullPath[fullPath.length - 1] : { ...start };

  const seen = new Set<string>();
  const uniquePath: Coordinate[] = [];
  for (const p of fullPath) {
    const key = `${p.x},${p.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePath.push(p);
    }
  }

  return {
    path: uniquePath,
    pathSegments,
    hitTarget,
    hitObstacle,
    bouncePoints,
    obstaclesPassed,
    reason,
  };
};
