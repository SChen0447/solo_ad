import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type CollisionBodyType = 'ground' | 'wall' | 'slope' | 'movingPlatform' | 'bouncePad';

export interface CollisionBody {
  id: string;
  type: CollisionBodyType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  slopeAngle: 30 | 45;
  platformSpeed: number;
  platformDirection: 1 | -1;
  platformOriginX: number;
  platformRange: number;
  bounceCooldown: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface CharacterState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  canDoubleJump: boolean;
  currentPlatformId: string | null;
}

export interface PhysicsParams {
  gravity: number;
  friction: number;
  bounce: number;
}

export interface DragState {
  isDragging: boolean;
  bodyType: CollisionBodyType | null;
  previewX: number;
  previewY: number;
}

export interface GameState {
  bodies: CollisionBody[];
  character: CharacterState;
  physics: PhysicsParams;
  particles: Particle[];
  selectedBodyId: string | null;
  dragState: DragState;
  keys: Set<string>;
  fps: number;
  frameTime: number;

  addBody: (body: Omit<CollisionBody, 'id'>) => string;
  removeBody: (id: string) => void;
  updateBody: (id: string, updates: Partial<CollisionBody>) => void;
  setSelectedBodyId: (id: string | null) => void;
  setCharacter: (updates: Partial<CharacterState>) => void;
  setPhysics: (updates: Partial<PhysicsParams>) => void;
  setParticles: (particles: Particle[]) => void;
  setDragState: (updates: Partial<DragState>) => void;
  setKeys: (keys: Set<string>) => void;
  setFps: (fps: number, frameTime: number) => void;
  saveScene: () => void;
  loadScene: () => void;
  resetCharacter: () => void;
}

const DEFAULT_CHARACTER: CharacterState = {
  x: 800,
  y: 400,
  vx: 0,
  vy: 0,
  onGround: false,
  canDoubleJump: true,
  currentPlatformId: null,
};

const DEFAULT_PHYSICS: PhysicsParams = {
  gravity: 980,
  friction: 0.3,
  bounce: 0.5,
};

export const useGameStore = create<GameState>((set, get) => ({
  bodies: [
    {
      id: uuidv4(),
      type: 'ground',
      x: 0,
      y: 850,
      width: 1600,
      height: 50,
      rotation: 0,
      slopeAngle: 45,
      platformSpeed: 0,
      platformDirection: 1,
      platformOriginX: 0,
      platformRange: 200,
      bounceCooldown: 0,
    },
  ],
  character: { ...DEFAULT_CHARACTER },
  physics: { ...DEFAULT_PHYSICS },
  particles: [],
  selectedBodyId: null,
  dragState: {
    isDragging: false,
    bodyType: null,
    previewX: 0,
    previewY: 0,
  },
  keys: new Set(),
  fps: 60,
  frameTime: 16.67,

  addBody: (body) => {
    const id = uuidv4();
    const newBody: CollisionBody = {
      ...body,
      id,
      platformOriginX: body.type === 'movingPlatform' ? body.x : 0,
    };
    set((state) => ({ bodies: [...state.bodies, newBody] }));
    return id;
  },

  removeBody: (id) => {
    set((state) => ({
      bodies: state.bodies.filter((b) => b.id !== id),
      selectedBodyId: state.selectedBodyId === id ? null : state.selectedBodyId,
    }));
  },

  updateBody: (id, updates) => {
    set((state) => ({
      bodies: state.bodies.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  },

  setSelectedBodyId: (id) => {
    set({ selectedBodyId: id });
  },

  setCharacter: (updates) => {
    set((state) => ({
      character: { ...state.character, ...updates },
    }));
  },

  setPhysics: (updates) => {
    set((state) => ({
      physics: { ...state.physics, ...updates },
    }));
  },

  setParticles: (particles) => {
    set({ particles });
  },

  setDragState: (updates) => {
    set((state) => ({
      dragState: { ...state.dragState, ...updates },
    }));
  },

  setKeys: (keys) => {
    set({ keys });
  },

  setFps: (fps, frameTime) => {
    set({ fps, frameTime });
  },

  saveScene: () => {
    const { bodies, physics } = get();
    const data = { bodies, physics, version: 1 };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'physics-sandbox-scene.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  loadScene: () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.bodies && data.physics) {
            set({
              bodies: data.bodies,
              physics: data.physics,
              selectedBodyId: null,
            });
          }
        } catch {
          console.error('Failed to load scene file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  resetCharacter: () => {
    set({ character: { ...DEFAULT_CHARACTER } });
  },
}));
