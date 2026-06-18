import { create } from 'zustand';

export type GemColor = 'red' | 'blue' | 'green';

export interface Platform {
  x: number;
  z: number;
  height: number;
  isStart: boolean;
  isEnd: boolean;
  floatOffset: number;
}

export interface Gem {
  id: string;
  color: GemColor;
  gridX: number;
  gridZ: number;
  collected: boolean;
  flying: boolean;
  flyProgress: number;
}

export interface Portal {
  id: string;
  color: GemColor;
  gridX: number;
  gridZ: number;
  activated: boolean;
  rotationSpeed: number;
  activationProgress: number;
}

export interface Player {
  gridX: number;
  gridZ: number;
  worldX: number;
  worldY: number;
  worldZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  moveProgress: number;
  isMoving: boolean;
  hitFlash: number;
  bounceBack: boolean;
}

export type GamePhase = 'fadeIn' | 'playing' | 'won';

export interface CelebrationParticle {
  id: number;
  angle: number;
  speed: number;
  color: string;
  life: number;
}

export interface GameState {
  phase: GamePhase;
  fadeOpacity: number;
  mazeSize: number;
  platforms: (Platform | null)[][];
  player: Player;
  gems: Gem[];
  portals: Portal[];
  elapsedTime: number;
  allGemsCollected: boolean;
  wonAnimationTime: number;
  cameraAngle: number;
  celebrationParticles: CelebrationParticle[];
  victoryFlash: number;
  generateMaze: () => void;
  tryMovePlayer: (dx: number, dz: number) => void;
  updateAnimations: (dt: number) => void;
  rotateCamera: (delta: number) => void;
  restartGame: () => void;
}

const COLOR_MAP: Record<GemColor, string> = {
  red: '#ff4d6d',
  blue: '#4dd2ff',
  green: '#4dff88',
};

export const GEM_COLORS: GemColor[] = ['red', 'blue', 'green'];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pseudoNoise(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function createPlatforms(size: number, seed: number): (Platform | null)[][] {
  const grid: (Platform | null)[][] = [];
  for (let z = 0; z < size; z++) {
    grid[z] = [];
    for (let x = 0; x < size; x++) {
      const noise = pseudoNoise(x, z, seed);
      if (noise < 0.12 && !(x === 0 && z === 0) && !(x === size - 1 && z === size - 1)) {
        grid[z][x] = null;
        continue;
      }
      const height = Math.floor(pseudoNoise(x, z, seed + 100) * 4);
      grid[z][x] = {
        x,
        z,
        height,
        isStart: x === 0 && z === 0,
        isEnd: x === size - 1 && z === size - 1,
        floatOffset: pseudoNoise(x, z, seed + 200) * Math.PI * 2,
      };
    }
  }
  if (!grid[0][0]) {
    grid[0][0] = { x: 0, z: 0, height: 0, isStart: true, isEnd: false, floatOffset: 0 };
  }
  if (!grid[size - 1][size - 1]) {
    grid[size - 1][size - 1] = {
      x: size - 1,
      z: size - 1,
      height: 0,
      isStart: false,
      isEnd: true,
      floatOffset: 0,
    };
  }
  return grid;
}

function isReachable(
  grid: (Platform | null)[][],
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number
): boolean {
  const size = grid.length;
  const visited = new Set<string>();
  const queue: [number, number][] = [[startX, startZ]];
  visited.add(`${startX},${startZ}`);
  while (queue.length) {
    const [cx, cz] = queue.shift()!;
    if (cx === targetX && cz === targetZ) return true;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dz] of dirs) {
      const nx = cx + dx;
      const nz = cz + dz;
      const key = `${nx},${nz}`;
      if (
        nx >= 0 &&
        nx < size &&
        nz >= 0 &&
        nz < size &&
        !visited.has(key) &&
        grid[nz][nx] !== null
      ) {
        visited.add(key);
        queue.push([nx, nz]);
      }
    }
  }
  return false;
}

function pickRandomEmptyCell(
  grid: (Platform | null)[][],
  taken: Set<string>,
  size: number
): [number, number] | null {
  const candidates: [number, number][] = [];
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const key = `${x},${z}`;
      if (grid[z][x] && !grid[z][x]!.isStart && !grid[z][x]!.isEnd && !taken.has(key)) {
        candidates.push([x, z]);
      }
    }
  }
  if (candidates.length === 0) return null;
  return candidates[rand(0, candidates.length - 1)];
}

export const GRID_SCALE = 2.2;
export const HEIGHT_SCALE = 0.7;

export function gridToWorld(gx: number, gz: number, height: number, size: number): [number, number, number] {
  const offset = ((size - 1) * GRID_SCALE) / 2;
  return [gx * GRID_SCALE - offset, height * HEIGHT_SCALE + 0.5, gz * GRID_SCALE - offset];
}

function generateMazeState(): {
  size: number;
  platforms: (Platform | null)[][];
  gems: Gem[];
  portals: Portal[];
  startHeight: number;
} {
  const size = rand(5, 8);
  const seed = Math.random() * 1000;
  const platforms = createPlatforms(size, seed);
  const endX = size - 1;
  const endZ = size - 1;
  const valid = isReachable(platforms, 0, 0, endX, endZ);
  if (!valid) {
    return generateMazeState();
  }
  const taken = new Set<string>();
  taken.add('0,0');
  taken.add(`${endX},${endZ}`);
  const gems: Gem[] = [];
  const portals: Portal[] = [];
  for (let i = 0; i < 3; i++) {
    const color = GEM_COLORS[i];
    const gemPos = pickRandomEmptyCell(platforms, taken, size);
    if (!gemPos) return generateMazeState();
    taken.add(`${gemPos[0]},${gemPos[1]}`);
    if (!isReachable(platforms, 0, 0, gemPos[0], gemPos[1])) {
      return generateMazeState();
    }
    gems.push({
      id: `gem-${color}`,
      color,
      gridX: gemPos[0],
      gridZ: gemPos[1],
      collected: false,
      flying: false,
      flyProgress: 0,
    });
  }
  for (let i = 0; i < 3; i++) {
    const color = GEM_COLORS[i];
    let attempts = 0;
    while (attempts < 20) {
      const portalPos = pickRandomEmptyCell(platforms, taken, size);
      if (!portalPos) break;
      const dx = Math.abs(portalPos[0] - gems[i].gridX);
      const dz = Math.abs(portalPos[1] - gems[i].gridZ);
      if (dx + dz >= 2) {
        taken.add(`${portalPos[0]},${portalPos[1]}`);
        if (!isReachable(platforms, 0, 0, portalPos[0], portalPos[1])) {
          return generateMazeState();
        }
        portals.push({
          id: `portal-${color}`,
          color,
          gridX: portalPos[0],
          gridZ: portalPos[1],
          activated: false,
          rotationSpeed: 0,
          activationProgress: 0,
        });
        break;
      }
      attempts++;
    }
    if (portals.length <= i) return generateMazeState();
  }
  const startHeight = platforms[0][0]!.height;
  return { size, platforms, gems, portals, startHeight };
}

export { COLOR_MAP };

export const useGameStore = create<GameState>((set, get) => {
  const initial = generateMazeState();
  const startPos = gridToWorld(0, 0, initial.startHeight, initial.size);

  return {
    phase: 'fadeIn',
    fadeOpacity: 1,
    mazeSize: initial.size,
    platforms: initial.platforms,
    player: {
      gridX: 0,
      gridZ: 0,
      worldX: startPos[0],
      worldY: startPos[1] + 0.6,
      worldZ: startPos[2],
      targetX: startPos[0],
      targetY: startPos[1] + 0.6,
      targetZ: startPos[2],
      moveProgress: 1,
      isMoving: false,
      hitFlash: 0,
      bounceBack: false,
    },
    gems: initial.gems,
    portals: initial.portals,
    elapsedTime: 0,
    allGemsCollected: false,
    wonAnimationTime: 0,
    cameraAngle: 0,
    celebrationParticles: [],
    victoryFlash: 0,

    generateMaze: () => {
      const maze = generateMazeState();
      const pos = gridToWorld(0, 0, maze.startHeight, maze.size);
      set({
        mazeSize: maze.size,
        platforms: maze.platforms,
        gems: maze.gems,
        portals: maze.portals,
        player: {
          gridX: 0,
          gridZ: 0,
          worldX: pos[0],
          worldY: pos[1] + 0.6,
          worldZ: pos[2],
          targetX: pos[0],
          targetY: pos[1] + 0.6,
          targetZ: pos[2],
          moveProgress: 1,
          isMoving: false,
          hitFlash: 0,
          bounceBack: false,
        },
        elapsedTime: 0,
        allGemsCollected: false,
        wonAnimationTime: 0,
        celebrationParticles: [],
        victoryFlash: 0,
      });
    },

    tryMovePlayer: (dx: number, dz: number) => {
      const state = get();
      if (state.phase !== 'playing') return;
      if (state.player.isMoving) return;

      const angle = state.cameraAngle;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const worldDx = dx * cosA - dz * sinA;
      const worldDz = dx * sinA + dz * cosA;
      const gx = state.player.gridX + Math.round(worldDx);
      const gz = state.player.gridZ + Math.round(worldDz);

      if (gx < 0 || gx >= state.mazeSize || gz < 0 || gz >= state.mazeSize) {
        set((s) => ({
          player: { ...s.player, hitFlash: 0.2 },
        }));
        return;
      }
      const targetPlatform = state.platforms[gz][gx];
      if (!targetPlatform) {
        set((s) => ({
          player: { ...s.player, hitFlash: 0.2 },
        }));
        return;
      }
      const [tx, ty, tz] = gridToWorld(gx, gz, targetPlatform.height, state.mazeSize);
      set((s) => ({
        player: {
          ...s.player,
          gridX: gx,
          gridZ: gz,
          targetX: tx,
          targetY: ty + 0.6,
          targetZ: tz,
          moveProgress: 0,
          isMoving: true,
        },
      }));
    },

    updateAnimations: (dt: number) => {
      const state = get();
      if (state.phase === 'fadeIn') {
        const newOpacity = Math.max(0, state.fadeOpacity - dt);
        const newPhase = newOpacity <= 0 ? 'playing' : 'fadeIn';
        set({ fadeOpacity: newOpacity, phase: newPhase });
        return;
      }
      if (state.phase === 'won') {
        const wonTime = state.wonAnimationTime + dt;
        const flash = Math.max(0, state.victoryFlash - dt * 2);
        set({
          wonAnimationTime: wonTime,
          victoryFlash: flash,
          celebrationParticles: state.celebrationParticles
            .map((p) => ({ ...p, life: p.life - dt }))
            .filter((p) => p.life > 0),
        });
        return;
      }

      set((s) => {
        const player = { ...s.player };
        if (player.isMoving) {
          const newProgress = Math.min(1, player.moveProgress + dt * 4.5);
          const t = easeOutCubic(newProgress);
          player.worldX = lerp(player.worldX, player.targetX, 0.25);
          player.worldZ = lerp(player.worldZ, player.targetZ, 0.25);
          player.worldY = lerp(player.worldY, player.targetY, 0.2);
          player.moveProgress = newProgress;
          if (newProgress >= 1) {
            player.isMoving = false;
            player.worldX = player.targetX;
            player.worldY = player.targetY;
            player.worldZ = player.targetZ;
          }
        }
        if (player.hitFlash > 0) {
          player.hitFlash = Math.max(0, player.hitFlash - dt);
        }

        const gems = s.gems.map((g) => {
          if (g.collected) return g;
          if (!g.flying) {
            const [gx, gy, gz] = gridToWorld(g.gridX, g.gridZ, s.platforms[g.gridZ][g.gridX]!.height, s.mazeSize);
            const dx = player.worldX - gx;
            const dy = player.worldY - (gy + 1.2);
            const dz = player.worldZ - gz;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 1.2) {
              return { ...g, flying: true, flyProgress: 0 };
            }
            return g;
          } else {
            const newFly = Math.min(1, g.flyProgress + dt * 3.3);
            if (newFly >= 1) {
              return { ...g, collected: true, flying: false, flyProgress: 1 };
            }
            return { ...g, flyProgress: newFly };
          }
        });

        const portals = s.portals.map((p) => {
          const relatedGem = gems.find((g) => g.color === p.color);
          const shouldActivate = relatedGem?.collected ?? false;
          const targetSpeed = shouldActivate ? 1 : 0;
          const targetProgress = shouldActivate ? 1 : 0;
          const newSpeed = lerp(p.rotationSpeed, targetSpeed, 0.06);
          const newProgress = lerp(p.activationProgress, targetProgress, 0.04);
          return {
            ...p,
            activated: shouldActivate,
            rotationSpeed: newSpeed,
            activationProgress: newProgress,
          };
        });

        const allCollected = gems.every((g) => g.collected);
        let newPhase: GamePhase = s.phase;
        let wonTime = s.wonAnimationTime;
        let victoryFlash = s.victoryFlash;
        let celebrationParticles = s.celebrationParticles;
        let elapsedTime = s.elapsedTime + dt;

        if (allCollected && !s.allGemsCollected) {
          const endPlatform = s.platforms[s.mazeSize - 1][s.mazeSize - 1];
          if (endPlatform) {
            for (let i = 0; i < 80; i++) {
              celebrationParticles.push({
                id: Math.random(),
                angle: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1.5,
                color: ['#ff4d6d', '#4dd2ff', '#4dff88', '#ffffff', '#ffd700'][Math.floor(Math.random() * 5)],
                life: 3,
              });
            }
            victoryFlash = 1;
          }
        }

        if (allCollected) {
          const endPlatform = s.platforms[s.mazeSize - 1][s.mazeSize - 1];
          if (endPlatform) {
            const [ex, ey, ez] = gridToWorld(endPlatform.x, endPlatform.z, endPlatform.height, s.mazeSize);
            const dx = player.worldX - ex;
            const dz = player.worldZ - ez;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 1.0 && Math.abs(player.worldY - ey) < 2.5) {
              newPhase = 'won';
              wonTime = 0;
              victoryFlash = 1.2;
              celebrationParticles = [];
              for (let i = 0; i < 180; i++) {
                celebrationParticles.push({
                  id: Math.random(),
                  angle: Math.random() * Math.PI * 2,
                  speed: 1 + Math.random() * 3,
                  color: ['#ff4d6d', '#4dd2ff', '#4dff88', '#ffffff', '#ffd700', '#ff9ff3'][Math.floor(Math.random() * 6)],
                  life: 2 + Math.random() * 1.5,
                });
              }
            }
          }
        }

        return {
          player,
          gems,
          portals,
          elapsedTime,
          allGemsCollected: allCollected,
          phase: newPhase,
          wonAnimationTime: wonTime,
          victoryFlash,
          celebrationParticles,
        };
      });
    },

    rotateCamera: (delta: number) => {
      set((s) => ({ cameraAngle: s.cameraAngle + delta }));
    },

    restartGame: () => {
      get().generateMaze();
      set({ phase: 'fadeIn', fadeOpacity: 1 });
    },
  };
});

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
