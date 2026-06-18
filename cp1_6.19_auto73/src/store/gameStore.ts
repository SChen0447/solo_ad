import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type FragmentShape = 'star' | 'diamond' | 'drop';
export type FragmentColor = 'gold' | 'jade' | 'blue' | 'red';

export interface Fragment {
  id: string;
  shape: FragmentShape;
  color: FragmentColor;
  gridX: number;
  gridY: number;
  collected: boolean;
  collectProgress: number;
  floatPhase: number;
}

export interface Blessing {
  id: string;
  name: string;
  description: string;
  requirements: { color: FragmentColor; count: number }[];
  effects: { stat: 'attack' | 'defense' | 'speed'; value: number }[];
  activated: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface PlayerStats {
  attack: number;
  defense: number;
  speed: number;
}

export interface GameState {
  fragments: Fragment[];
  blessings: Blessing[];
  playerStats: PlayerStats;
  baseStats: PlayerStats;
  particles: Particle[];
  flashActive: boolean;
  portalVisible: boolean;
  dialogueVisible: boolean;
  dialogueText: string;

  collectFragment: (id: string) => void;
  activateBlessing: (id: string) => void;
  addParticles: (x: number, y: number, color: string) => void;
  updateParticle: (id: string, delta: number) => void;
  removeParticle: (id: string) => void;
  triggerFlash: () => void;
  togglePortal: (visible: boolean) => void;
  showDialogue: (text: string) => void;
  hideDialogue: () => void;
  initGame: () => void;
}

const colorMap: Record<FragmentColor, string> = {
  gold: '#f7b731',
  jade: '#20bf6b',
  blue: '#4b7bec',
  red: '#fc5c65',
};

const initialBlessings: Blessing[] = [
  {
    id: 'blessing-strength',
    name: '力量祝福',
    description: '攻击力提升20%',
    requirements: [{ color: 'red', count: 3 }],
    effects: [{ stat: 'attack', value: 0.2 }],
    activated: false,
  },
  {
    id: 'blessing-agility',
    name: '敏捷祝福',
    description: '移动速度提升15%',
    requirements: [
      { color: 'gold', count: 2 },
      { color: 'blue', count: 1 },
    ],
    effects: [{ stat: 'speed', value: 0.15 }],
    activated: false,
  },
  {
    id: 'blessing-fortress',
    name: '守护祝福',
    description: '防御力提升25%',
    requirements: [
      { color: 'blue', count: 2 },
      { color: 'jade', count: 1 },
    ],
    effects: [{ stat: 'defense', value: 0.25 }],
    activated: false,
  },
  {
    id: 'blessing-luck',
    name: '幸运祝福',
    description: '全属性提升5%',
    requirements: [
      { color: 'gold', count: 1 },
      { color: 'jade', count: 1 },
      { color: 'blue', count: 1 },
    ],
    effects: [
      { stat: 'attack', value: 0.05 },
      { stat: 'defense', value: 0.05 },
      { stat: 'speed', value: 0.05 },
    ],
    activated: false,
  },
  {
    id: 'blessing-dream',
    name: '梦境祝福',
    description: '攻击力+10%，速度+10%',
    requirements: [
      { color: 'gold', count: 1 },
      { color: 'red', count: 1 },
      { color: 'jade', count: 1 },
      { color: 'blue', count: 1 },
    ],
    effects: [
      { stat: 'attack', value: 0.1 },
      { stat: 'speed', value: 0.1 },
    ],
    activated: false,
  },
];

const baseStats: PlayerStats = {
  attack: 100,
  defense: 100,
  speed: 100,
};

function generateFragments(): Fragment[] {
  const shapes: FragmentShape[] = ['star', 'diamond', 'drop'];
  const colors: FragmentColor[] = ['gold', 'jade', 'blue', 'red'];
  const fragments: Fragment[] = [];
  const usedPositions = new Set<string>();

  while (fragments.length < 12) {
    const gridX = Math.floor(Math.random() * 6);
    const gridY = Math.floor(Math.random() * 6);
    const posKey = `${gridX},${gridY}`;

    if (usedPositions.has(posKey)) continue;
    usedPositions.add(posKey);

    fragments.push({
      id: uuidv4(),
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      gridX,
      gridY,
      collected: false,
      collectProgress: 0,
      floatPhase: Math.random() * Math.PI * 2,
    });
  }

  return fragments;
}

function calculateStats(blessings: Blessing[], base: PlayerStats): PlayerStats {
  let attackBonus = 0;
  let defenseBonus = 0;
  let speedBonus = 0;

  blessings.forEach((b) => {
    if (!b.activated) return;
    b.effects.forEach((e) => {
      if (e.stat === 'attack') attackBonus += e.value;
      if (e.stat === 'defense') defenseBonus += e.value;
      if (e.stat === 'speed') speedBonus += e.value;
    });
  });

  return {
    attack: Math.round(base.attack * (1 + attackBonus)),
    defense: Math.round(base.defense * (1 + defenseBonus)),
    speed: Math.round(base.speed * (1 + speedBonus)),
  };
}

export const useGameStore = create<GameState>((set) => ({
  fragments: [],
  blessings: initialBlessings,
  playerStats: { ...baseStats },
  baseStats: { ...baseStats },
  particles: [],
  flashActive: false,
  portalVisible: false,
  dialogueVisible: false,
  dialogueText: '',

  initGame: () => {
    set({
      fragments: generateFragments(),
      blessings: initialBlessings.map((b) => ({ ...b, activated: false })),
      playerStats: { ...baseStats },
      particles: [],
      flashActive: false,
      portalVisible: false,
      dialogueVisible: false,
      dialogueText: '',
    });
  },

  collectFragment: (id: string) => {
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, collected: true } : f
      ),
    }));
  },

  activateBlessing: (id: string) => {
    set((state) => {
      const newBlessings = state.blessings.map((b) =>
        b.id === id ? { ...b, activated: true } : b
      );
      const activatedCount = newBlessings.filter((b) => b.activated).length;
      return {
        blessings: newBlessings,
        playerStats: calculateStats(newBlessings, state.baseStats),
        portalVisible: activatedCount >= 4,
      };
    });
  },

  addParticles: (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 60 + Math.random() * 40;
      newParticles.push({
        id: uuidv4(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        color,
        size: 3 + Math.random() * 2,
      });
    }
    set((state) => ({
      particles: [...state.particles, ...newParticles].slice(0, 50),
    }));
  },

  updateParticle: (id: string, delta: number) => {
    set((state) => ({
      particles: state.particles.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          x: p.x + p.vx * delta,
          y: p.y + p.vy * delta,
          life: p.life - delta,
        };
      }),
    }));
  },

  removeParticle: (id: string) => {
    set((state) => ({
      particles: state.particles.filter((p) => p.id !== id),
    }));
  },

  triggerFlash: () => {
    set({ flashActive: true });
    setTimeout(() => set({ flashActive: false }), 300);
  },

  togglePortal: (visible: boolean) => {
    set({ portalVisible: visible });
  },

  showDialogue: (text: string) => {
    set({ dialogueVisible: true, dialogueText: text });
  },

  hideDialogue: () => {
    set({ dialogueVisible: false, dialogueText: '' });
  },
}));

export { colorMap };
