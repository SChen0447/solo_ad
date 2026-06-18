import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  HandData,
  DrumType,
  DrumZone,
  DrumState,
  HitRecord,
  AudioDeviceState,
  GestureState,
  RippleAnimation,
  TrailPoint,
  Particle,
  AppEvent,
  EventCallback,
  VelocityLevel,
} from './types';

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(eventType: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  emit(event: AppEvent): void {
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      callbacks.forEach((cb) => cb(event));
    }
  }

  off(eventType: string, callback: EventCallback): void {
    this.listeners.get(eventType)?.delete(callback);
  }
}

export const eventBus = new EventBus();

export const DRUM_ZONES: DrumZone[] = [
  {
    id: 'kick',
    name: '底鼓',
    shape: 'ellipse',
    x: 50,
    y: 78,
    width: 16,
    height: 10,
    gradient: ['#4A2C1A', '#2D1810', '#1A0F08'],
    strokeColor: '#3D2415',
  },
  {
    id: 'snare',
    name: '军鼓',
    shape: 'circle',
    x: 50,
    y: 58,
    width: 10,
    height: 10,
    gradient: ['#E8E8E8', '#C0C0C0', '#909090'],
    strokeColor: '#8B8B8B',
    hasMetalRing: true,
  },
  {
    id: 'tom',
    name: '嗵鼓',
    shape: 'circle',
    x: 72,
    y: 28,
    width: 8,
    height: 8,
    gradient: ['#8B1A1A', '#5C1212', '#3D0C0C'],
    strokeColor: '#6B1515',
  },
  {
    id: 'hihat',
    name: '踩镲',
    shape: 'circle',
    x: 28,
    y: 28,
    width: 7,
    height: 7,
    gradient: ['#FFD700', '#DAA520', '#B8860B'],
    strokeColor: '#CD950C',
    hasRayTexture: true,
  },
  {
    id: 'crash',
    name: '吊镲',
    shape: 'ellipse',
    x: 78,
    y: 48,
    width: 6,
    height: 12,
    gradient: ['#F0F0F0', '#C8C8C8', '#A0A0A0'],
    strokeColor: '#787878',
  },
];

interface AppState {
  handData: HandData[];
  drumStates: Record<DrumType, DrumState>;
  hitRecords: HitRecord[];
  ripples: RippleAnimation[];
  trails: Record<string, TrailPoint[]>;
  particles: Particle[];
  audioState: AudioDeviceState;
  gestureState: GestureState;
  cameraError: string | null;
  canvasSize: { width: number; height: number };

  setHandData: (data: HandData[]) => void;
  triggerDrumHit: (
    drumId: DrumType,
    velocity: number,
    hitX: number,
    hitY: number,
    timestamp: number
  ) => void;
  addRipple: (
    drumId: DrumType,
    x: number,
    y: number,
    startRadius: number,
    maxRadius: number
  ) => void;
  removeRipple: (id: string) => void;
  updateTrail: (handId: string, x: number, y: number, timestamp: number) => void;
  addHitRecord: (record: Omit<HitRecord, 'id'>) => void;
  clearOldHitRecords: () => void;
  setAudioMuted: (muted: boolean) => void;
  setAudioInitialized: (initialized: boolean) => void;
  setGestureInitializing: (initializing: boolean) => void;
  setGestureInitialized: (initialized: boolean) => void;
  setGestureError: (error: string | null) => void;
  setCameraError: (error: string | null) => void;
  setCanvasSize: (width: number, height: number) => void;
  updateParticles: (deltaTime: number) => void;
  initParticles: () => void;
  getVelocityLevel: (velocityValue: number) => VelocityLevel;
  resetGestureState: () => void;
}

const createInitialDrumStates = (): Record<DrumType, DrumState> => ({
  kick: { isHit: false, hitTime: 0, rippleStartRadius: 0, brightness: 0 },
  snare: { isHit: false, hitTime: 0, rippleStartRadius: 0, brightness: 0 },
  tom: { isHit: false, hitTime: 0, rippleStartRadius: 0, brightness: 0 },
  hihat: { isHit: false, hitTime: 0, rippleStartRadius: 0, brightness: 0 },
  crash: { isHit: false, hitTime: 0, rippleStartRadius: 0, brightness: 0 },
});

export const useAppStore = create<AppState>((set, get) => ({
  handData: [],
  drumStates: createInitialDrumStates(),
  hitRecords: [],
  ripples: [],
  trails: {},
  particles: [],
  audioState: { initialized: false, muted: false },
  gestureState: { isInitializing: false, isInitialized: false, error: null },
  cameraError: null,
  canvasSize: { width: 800, height: 600 },

  setHandData: (data: HandData[]) => {
    set({ handData: data });
    data.forEach((hand) => {
      const indexTip = hand.landmarks[8];
      if (indexTip) {
        const { canvasSize } = get();
        const x = indexTip.x * canvasSize.width;
        const y = indexTip.y * canvasSize.height;
        get().updateTrail(hand.id, x, y, hand.timestamp);
      }
    });
    eventBus.emit({ type: 'handData', data });
  },

  triggerDrumHit: (
    drumId: DrumType,
    velocity: number,
    hitX: number,
    hitY: number,
    timestamp: number
  ) => {
    const { drumStates } = get();
    const now = Date.now();
    const lastHit = drumStates[drumId].hitTime;
    
    if (now - lastHit < 100) return;

    const maxRadius = DRUM_ZONES.find((d) => d.id === drumId)!.width * 1.5;
    const startRadius = velocity * 30 + 10;
    const brightness = velocity * 0.5;

    set((state) => ({
      drumStates: {
        ...state.drumStates,
        [drumId]: {
          isHit: true,
          hitTime: now,
          rippleStartRadius: startRadius,
          brightness,
        },
      },
    }));

    get().addRipple(drumId, hitX, hitY, startRadius, maxRadius);
    get().addHitRecord({
      drumId,
      drumName: DRUM_ZONES.find((d) => d.id === drumId)!.name,
      timestamp,
      velocity: get().getVelocityLevel(velocity),
      velocityValue: velocity,
      hitX,
      hitY,
    });

    eventBus.emit({
      type: 'drumHit',
      data: { drumId, velocity, hitX, hitY, timestamp },
    });

    setTimeout(() => {
      set((state) => ({
        drumStates: {
          ...state.drumStates,
          [drumId]: {
            ...state.drumStates[drumId],
            isHit: false,
            brightness: 0,
          },
        },
      }));
    }, 300);
  },

  addRipple: (drumId, x, y, startRadius, maxRadius) => {
    const ripple: RippleAnimation = {
      id: uuidv4(),
      drumId,
      x,
      y,
      startTime: Date.now(),
      startRadius,
      maxRadius,
    };
    set((state) => ({ ripples: [...state.ripples, ripple] }));
    setTimeout(() => {
      get().removeRipple(ripple.id);
    }, 200);
  },

  removeRipple: (id) => {
    set((state) => ({
      ripples: state.ripples.filter((r) => r.id !== id),
    }));
  },

  updateTrail: (handId, x, y, timestamp) => {
    set((state) => {
      const existingTrail = state.trails[handId] || [];
      const newPoint: TrailPoint = { x, y, timestamp, opacity: 1 };
      const updatedTrail = [...existingTrail, newPoint]
        .filter((p) => timestamp - p.timestamp < 500)
        .map((p, i, arr) => ({
          ...p,
          opacity: (i + 1) / arr.length,
        }));
      return {
        trails: {
          ...state.trails,
          [handId]: updatedTrail,
        },
      };
    });
  },

  addHitRecord: (record) => {
    const newRecord: HitRecord = {
      ...record,
      id: uuidv4(),
    };
    set((state) => {
      const records = [...state.hitRecords, newRecord].slice(-30);
      return { hitRecords: records };
    });
  },

  clearOldHitRecords: () => {
    const thirtySecondsAgo = Date.now() - 30000;
    set((state) => ({
      hitRecords: state.hitRecords.filter((r) => r.timestamp > thirtySecondsAgo),
    }));
  },

  setAudioMuted: (muted) => {
    set((state) => ({
      audioState: { ...state.audioState, muted },
    }));
  },

  setAudioInitialized: (initialized) => {
    set((state) => ({
      audioState: { ...state.audioState, initialized },
    }));
  },

  setGestureInitializing: (initializing) => {
    set((state) => ({
      gestureState: { ...state.gestureState, isInitializing: initializing },
    }));
  },

  setGestureInitialized: (initialized) => {
    set((state) => ({
      gestureState: { ...state.gestureState, isInitialized: initialized },
    }));
  },

  setGestureError: (error) => {
    set((state) => ({
      gestureState: { ...state.gestureState, error },
    }));
  },

  setCameraError: (error) => {
    set({ cameraError: error });
  },

  setCanvasSize: (width, height) => {
    set({ canvasSize: { width, height } });
  },

  updateParticles: (deltaTime) => {
    set((state) => ({
      particles: state.particles.map((p) => {
        let newX = p.x + p.vx * deltaTime;
        let newY = p.y + p.vy * deltaTime;
        const { canvasSize } = get();

        if (newX < 0 || newX > canvasSize.width) p.vx *= -1;
        if (newY < 0 || newY > canvasSize.height) p.vy *= -1;

        newX = Math.max(0, Math.min(canvasSize.width, newX));
        newY = Math.max(0, Math.min(canvasSize.height, newY));

        return { ...p, x: newX, y: newY };
      }),
    }));
  },

  initParticles: () => {
    const { canvasSize } = get();
    const particles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        id: uuidv4(),
        x: Math.random() * canvasSize.width,
        y: Math.random() * canvasSize.height,
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }
    set({ particles });
  },

  getVelocityLevel: (velocityValue) => {
    if (velocityValue < 0.33) return '弱';
    if (velocityValue < 0.66) return '中';
    return '强';
  },

  resetGestureState: () => {
    set({
      gestureState: { isInitializing: false, isInitialized: false, error: null },
      handData: [],
      trails: {},
    });
  },
}));
