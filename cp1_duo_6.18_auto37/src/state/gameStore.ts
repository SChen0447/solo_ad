import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Crystal {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  collectAnim: number;
}

export type GameState = 'playing' | 'won' | 'lost';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface GameStoreState {
  playerX: number;
  playerY: number;
  lavaHeight: number;
  crystals: Crystal[];
  portalActive: boolean;
  portalX: number;
  portalY: number;
  portalRotation: number;
  score: number;
  stamina: number;
  gameState: GameState;
  elapsed: number;
  totalCrystals: number;
  particles: Particle[];
  flashTimer: number;
  lowFps: boolean;
  winAnimTimer: number;
  loseAnimTimer: number;

  setPlayerPos: (x: number, y: number) => void;
  setLavaHeight: (h: number) => void;
  collectCrystal: (id: string) => void;
  setPortalActive: (active: boolean) => void;
  setPortalRotation: (r: number) => void;
  setScore: (s: number) => void;
  setStamina: (s: number) => void;
  setGameState: (s: GameState) => void;
  addElapsed: (dt: number) => void;
  spawnParticles: (x: number, y: number, count: number) => void;
  updateParticles: (dt: number) => void;
  setFlashTimer: (t: number) => void;
  setLowFps: (v: boolean) => void;
  setWinAnimTimer: (t: number) => void;
  setLoseAnimTimer: (t: number) => void;
  resetGame: (crystals: Crystal[], portalX: number, portalY: number) => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  playerX: 60,
  playerY: 60,
  lavaHeight: 0,
  crystals: [],
  portalActive: false,
  portalX: 0,
  portalY: 0,
  portalRotation: 0,
  score: 0,
  stamina: 100,
  gameState: 'playing',
  elapsed: 0,
  totalCrystals: 0,
  particles: [],
  flashTimer: 0,
  lowFps: false,
  winAnimTimer: 0,
  loseAnimTimer: 0,

  setPlayerPos: (x, y) => set({ playerX: x, playerY: y }),
  setLavaHeight: (h) => set({ lavaHeight: h }),
  collectCrystal: (id) =>
    set((state) => {
      const crystals = state.crystals.map((c) =>
        c.id === id ? { ...c, collected: true, collectAnim: 0.3 } : c
      );
      const allCollected = crystals.every((c) => c.collected);
      return {
        crystals,
        portalActive: allCollected,
        flashTimer: allCollected ? 0.1 : state.flashTimer,
      };
    }),
  setPortalActive: (active) => set({ portalActive: active }),
  setPortalRotation: (r) => set({ portalRotation: r }),
  setScore: (s) => set({ score: s }),
  setStamina: (s) => set({ stamina: Math.max(0, Math.min(100, s)) }),
  setGameState: (s) => set({ gameState: s }),
  addElapsed: (dt) => set((state) => ({ elapsed: state.elapsed + dt })),
  spawnParticles: (x, y, count) =>
    set((state) => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 60 + Math.random() * 40;
        newParticles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.3,
          maxLife: 0.3,
        });
      }
      return { particles: [...state.particles, ...newParticles] };
    }),
  updateParticles: (dt) =>
    set((state) => ({
      particles: state.particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          life: p.life - dt,
        }))
        .filter((p) => p.life > 0),
    })),
  setFlashTimer: (t) => set({ flashTimer: t }),
  setLowFps: (v) => set({ lowFps: v }),
  setWinAnimTimer: (t) => set({ winAnimTimer: t }),
  setLoseAnimTimer: (t) => set({ loseAnimTimer: t }),
  resetGame: (crystals, portalX, portalY) =>
    set({
      playerX: 60,
      playerY: 60,
      lavaHeight: 0,
      crystals,
      portalActive: false,
      portalX,
      portalY,
      portalRotation: 0,
      score: 0,
      stamina: 100,
      gameState: 'playing',
      elapsed: 0,
      totalCrystals: crystals.length,
      particles: [],
      flashTimer: 0,
      lowFps: false,
      winAnimTimer: 0,
      loseAnimTimer: 0,
    }),
}));
