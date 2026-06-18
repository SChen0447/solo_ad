export type CellType = 'wall' | 'path';

export interface BeamNode {
  x: number;
  z: number;
  colorPool: 'red-orange' | 'blue-purple' | 'green-cyan';
  colorOffset: number;
}

export const MAZE_SIZE = 15;
export const CELL_SIZE = 1;
export const WALL_RADIUS = 0.15;
export const PLAYER_RADIUS = 0.4;
export const BEAM_HEIGHT = 8;
export const BEAM_DIAMETER = 0.3;

const DIRECTIONS = [
  { dx: 0, dz: -2 },
  { dx: 2, dz: 0 },
  { dx: 0, dz: 2 },
  { dx: -2, dz: 0 },
];

const COLOR_POOLS: Array<'red-orange' | 'blue-purple' | 'green-cyan'> = [
  'red-orange',
  'blue-purple',
  'green-cyan',
];

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateMaze(): {
  maze: CellType[][];
  beams: BeamNode[];
} {
  const maze: CellType[][] = [];
  for (let z = 0; z < MAZE_SIZE; z++) {
    maze[z] = [];
    for (let x = 0; x < MAZE_SIZE; x++) {
      maze[z][x] = 'wall';
    }
  }

  const visited = new Set<string>();

  function carve(x: number, z: number) {
    maze[z][x] = 'path';
    visited.add(`${x},${z}`);

    const directions = shuffle(DIRECTIONS);

    for (const dir of directions) {
      const nx = x + dir.dx;
      const nz = z + dir.dz;
      const wx = x + dir.dx / 2;
      const wz = z + dir.dz / 2;

      if (
        nx >= 0 &&
        nx < MAZE_SIZE &&
        nz >= 0 &&
        nz < MAZE_SIZE &&
        !visited.has(`${nx},${nz}`)
      ) {
        maze[wz][wx] = 'path';
        carve(nx, nz);
      }
    }
  }

  carve(0, 0);
  maze[0][0] = 'path';
  maze[MAZE_SIZE - 1][MAZE_SIZE - 1] = 'path';

  const beams: BeamNode[] = [];
  for (let z = 0; z < MAZE_SIZE; z++) {
    for (let x = 0; x < MAZE_SIZE; x++) {
      if (maze[z][x] === 'wall') {
        beams.push({
          x: x * CELL_SIZE,
          z: z * CELL_SIZE,
          colorPool: COLOR_POOLS[Math.floor(Math.random() * COLOR_POOLS.length)],
          colorOffset: Math.random() * 60,
        });
      }
    }
  }

  return { maze, beams };
}

export function checkCollision(
  playerX: number,
  playerZ: number,
  beams: BeamNode[]
): boolean {
  const minDistance = WALL_RADIUS + PLAYER_RADIUS;
  const cellX = Math.floor(playerX / CELL_SIZE);
  const cellZ = Math.floor(playerZ / CELL_SIZE);

  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const checkX = cellX + dx;
      const checkZ = cellZ + dz;

      for (const beam of beams) {
        const beamCellX = Math.floor(beam.x / CELL_SIZE);
        const beamCellZ = Math.floor(beam.z / CELL_SIZE);

        if (beamCellX === checkX && beamCellZ === checkZ) {
          const dist = Math.hypot(playerX - beam.x, playerZ - beam.z);
          if (dist < minDistance) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export function getRoomCoordinates(
  x: number,
  z: number
): { roomX: number; roomZ: number } {
  return {
    roomX: Math.floor(x / CELL_SIZE),
    roomZ: Math.floor(z / CELL_SIZE),
  };
}

export function isAtExit(
  playerX: number,
  playerZ: number,
  exitX: number = MAZE_SIZE - 1,
  exitZ: number = MAZE_SIZE - 1
): boolean {
  const dist = Math.hypot(
    playerX - exitX * CELL_SIZE,
    playerZ - exitZ * CELL_SIZE
  );
  return dist < 0.8;
}
