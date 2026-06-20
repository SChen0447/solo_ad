export enum ParticleType {
  FIRE = 'fire',
  WATER = 'water',
  EARTH = 'earth',
  PLANT = 'plant',
  MAGIC = 'magic'
}

export interface ParticleConfig {
  type: ParticleType;
  color: string;
  glowColor: string;
  density: number;
  friction: number;
  gravity: number;
  lifeTime: number;
  size: number;
  isStatic: boolean;
  spreadOnContact: boolean;
  iconSymbol: string;
  displayName: string;
}

export const PARTICLE_CONFIGS: Record<ParticleType, ParticleConfig> = {
  [ParticleType.FIRE]: {
    type: ParticleType.FIRE,
    color: '#ff4500',
    glowColor: 'rgba(255, 100, 0, 0.6)',
    density: 0.3,
    friction: 0.98,
    gravity: -0.15,
    lifeTime: 120,
    size: 4,
    isStatic: false,
    spreadOnContact: true,
    iconSymbol: '🔥',
    displayName: '火'
  },
  [ParticleType.WATER]: {
    type: ParticleType.WATER,
    color: '#1e90ff',
    glowColor: 'rgba(30, 144, 255, 0.4)',
    density: 1.0,
    friction: 0.92,
    gravity: 0.25,
    lifeTime: 600,
    size: 4,
    isStatic: false,
    spreadOnContact: false,
    iconSymbol: '💧',
    displayName: '水'
  },
  [ParticleType.EARTH]: {
    type: ParticleType.EARTH,
    color: '#8b4513',
    glowColor: 'rgba(139, 69, 19, 0.2)',
    density: 2.0,
    friction: 0.99,
    gravity: 0.3,
    lifeTime: -1,
    size: 5,
    isStatic: true,
    spreadOnContact: false,
    iconSymbol: '⛰️',
    displayName: '土'
  },
  [ParticleType.PLANT]: {
    type: ParticleType.PLANT,
    color: '#32cd32',
    glowColor: 'rgba(50, 205, 50, 0.4)',
    density: 0.5,
    friction: 0.95,
    gravity: 0,
    lifeTime: -1,
    size: 3,
    isStatic: true,
    spreadOnContact: true,
    iconSymbol: '🌿',
    displayName: '植物'
  },
  [ParticleType.MAGIC]: {
    type: ParticleType.MAGIC,
    color: '#9932cc',
    glowColor: 'rgba(153, 50, 204, 0.7)',
    density: 0.2,
    friction: 0.96,
    gravity: 0,
    lifeTime: 180,
    size: 5,
    isStatic: false,
    spreadOnContact: false,
    iconSymbol: '✨',
    displayName: '魔法'
  }
};

export const PARTICLE_TYPE_KEYS = [
  ParticleType.FIRE,
  ParticleType.WATER,
  ParticleType.EARTH,
  ParticleType.PLANT,
  ParticleType.MAGIC
];
