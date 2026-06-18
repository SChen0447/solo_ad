import { create } from 'zustand';

export const CONSTANTS = {
  MAZE_SIZE: 700,
  MAZE_SIZE_MOBILE: 500,
  GRID_SIZE: 50,
  WALL_THICKNESS: 6,
  SOURCE_RADIUS: 10,
  SOURCE_DEFAULT_X: 50,
  SOURCE_DEFAULT_Y: 50,
  WAVE_SPEED: 3,
  WAVE_DECAY: 0.95,
  WAVES_PER_DIRECTION: 7,
  MAX_WAVES: 500,
  RECEIVER_RADIUS: 12,
  RECEIVER_THRESHOLD: 0.6,
  MAX_WALLS: 15,
  MAX_PARTICLES: 100,
  COLORS: {
    BG_MAIN: '#0f0f1a',
    BG_MAZE: '#1a1a2e',
    WALL: '#e0e0e0',
    SOURCE: '#ffd700',
    WAVE: 'rgba(100, 149, 237, 0.6)',
    RECEIVER_OUTER: '#00ffff',
    RECEIVER_LOW: '#8b0000',
    RECEIVER_HIGH: '#00ff00',
    PARTICLE: '#87ceeb',
  },
  TARGET_FPS: 60,
  MIN_PHYSICS_FPS: 30,
} as const;

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Source {
  x: number;
  y: number;
}

export interface Receiver {
  id: number;
  x: number;
  y: number;
  intensity: number;
  threshold: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface SoundWave {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  angle: number;
  originAngle: number;
  fanDirIndex: number;
  intensity: number;
  age: number;
  maxAge: number;
  reflections: number;
}

interface GameState {
  mazeSize: number;
  isMobile: boolean;
  walls: Wall[];
  source: Source;
  isDraggingSource: boolean;
  receivers: Receiver[];
  waves: SoundWave[];
  particles: Particle[];
  isDrawingWall: boolean;
  wallStart: { x: number; y: number } | null;
  hoveredReceiverId: number | null;
  waveIdCounter: number;
  frameCount: number;

  setIsMobile: (isMobile: boolean) => void;
  setMazeSize: (size: number) => void;
  addWall: (wall: Wall) => boolean;
  removeWall: (index: number) => void;
  clearWalls: () => void;
  setSourcePosition: (x: number, y: number) => void;
  setIsDraggingSource: (dragging: boolean) => void;
  updateReceiverIntensity: (id: number, intensity: number) => void;
  resetReceiverIntensities: () => void;
  addWave: (wave: Omit<SoundWave, 'id'>) => void;
  removeWave: (index: number) => void;
  clearWaves: () => void;
  updateWaves: (waves: SoundWave[]) => void;
  addParticle: (particle: Omit<Particle, 'life'>) => void;
  updateParticles: () => void;
  setIsDrawingWall: (drawing: boolean) => void;
  setWallStart: (start: { x: number; y: number } | null) => void;
  setHoveredReceiver: (id: number | null) => void;
  incrementFrameCount: () => void;
  resetGame: () => void;
}

const initialReceivers: Receiver[] = [
  { id: 1, x: 650, y: 50, intensity: 0, threshold: CONSTANTS.RECEIVER_THRESHOLD },
  { id: 2, x: 650, y: 650, intensity: 0, threshold: CONSTANTS.RECEIVER_THRESHOLD },
  { id: 3, x: 350, y: 350, intensity: 0, threshold: CONSTANTS.RECEIVER_THRESHOLD },
  { id: 4, x: 50, y: 650, intensity: 0, threshold: CONSTANTS.RECEIVER_THRESHOLD },
];

const createInitialState = () => ({
  mazeSize: CONSTANTS.MAZE_SIZE,
  isMobile: false,
  walls: [] as Wall[],
  source: { x: CONSTANTS.SOURCE_DEFAULT_X, y: CONSTANTS.SOURCE_DEFAULT_Y } as Source,
  isDraggingSource: false,
  receivers: [...initialReceivers],
  waves: [] as SoundWave[],
  particles: [] as Particle[],
  isDrawingWall: false,
  wallStart: null as { x: number; y: number } | null,
  hoveredReceiverId: null as number | null,
  waveIdCounter: 0,
  frameCount: 0,
});

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  setIsMobile: (isMobile) => set({ isMobile }),
  setMazeSize: (size) => set({ mazeSize: size }),

  addWall: (wall) => {
    const state = get();
    if (state.walls.length >= CONSTANTS.MAX_WALLS) return false;
    const dx = Math.abs(wall.x2 - wall.x1);
    const dy = Math.abs(wall.y2 - wall.y1);
    if (dx < 10 && dy < 10) return false;
    set({ walls: [...state.walls, wall] });
    return true;
  },

  removeWall: (index) => {
    const state = get();
    const newWalls = state.walls.filter((_, i) => i !== index);
    set({ walls: newWalls });
  },

  clearWalls: () => set({ walls: [] }),

  setSourcePosition: (x, y) => {
    const snappedX = Math.round(x / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE;
    const snappedY = Math.round(y / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE;
    const mazeSize = get().mazeSize;
    const clampedX = Math.max(CONSTANTS.GRID_SIZE, Math.min(mazeSize - CONSTANTS.GRID_SIZE, snappedX));
    const clampedY = Math.max(CONSTANTS.GRID_SIZE, Math.min(mazeSize - CONSTANTS.GRID_SIZE, snappedY));
    set({ source: { x: clampedX, y: clampedY }, waves: [] });
  },

  setIsDraggingSource: (dragging) => set({ isDraggingSource: dragging }),

  updateReceiverIntensity: (id, intensity) => {
    set((state) => ({
      receivers: state.receivers.map((r) =>
        r.id === id ? { ...r, intensity: Math.min(1, Math.max(0, intensity)) } : r
      ),
    }));
  },

  resetReceiverIntensities: () => {
    set((state) => ({
      receivers: state.receivers.map((r) => ({ ...r, intensity: 0 })),
    }));
  },

  addWave: (wave) => {
    const state = get();
    if (state.waves.length >= CONSTANTS.MAX_WAVES) return;
    const newWave = { ...wave, id: state.waveIdCounter };
    set({
      waves: [...state.waves, newWave],
      waveIdCounter: state.waveIdCounter + 1,
    });
  },

  removeWave: (index) => {
    set((state) => ({
      waves: state.waves.filter((_, i) => i !== index),
    }));
  },

  clearWaves: () => set({ waves: [] }),

  updateWaves: (waves) => set({ waves }),

  addParticle: (particle) => {
    const state = get();
    const newParticle = { ...particle, life: 1 };
    const newParticles = [...state.particles, newParticle];
    if (newParticles.length > CONSTANTS.MAX_PARTICLES) {
      newParticles.shift();
    }
    set({ particles: newParticles });
  },

  updateParticles: () => {
    set((state) => ({
      particles: state.particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02,
        }))
        .filter((p) => p.life > 0),
    }));
  },

  setIsDrawingWall: (drawing) => set({ isDrawingWall: drawing }),
  setWallStart: (start) => set({ wallStart: start }),
  setHoveredReceiver: (id) => set({ hoveredReceiverId: id }),
  incrementFrameCount: () => set((state) => ({ frameCount: state.frameCount + 1 })),

  resetGame: () => {
    set(createInitialState());
  },
}));

export function snapToGrid(value: number): number {
  return Math.round(value / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE;
}

export function clampToMaze(value: number, mazeSize: number): number {
  return Math.max(0, Math.min(mazeSize, value));
}
