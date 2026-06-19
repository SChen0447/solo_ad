export const CONFIG = {
  WORLD: {
    GRID_SIZE: 6,
    CELL_SIZE: 200,
    get width() { return this.GRID_SIZE * this.CELL_SIZE; },
    get height() { return this.GRID_SIZE * this.CELL_SIZE; }
  },

  PLAYER: {
    SIZE: 30,
    ACCELERATION: 420,
    MAX_SPEED: 220,
    FRICTION: 2.5,
    INTERACT_RADIUS: 55,
    START_X: 0,
    START_Y: 0
  },

  OXYGEN: {
    MAX: 100,
    CONSUMPTION_RATE: 1.8,
    BUBBLE_RESTORE: 20,
    BUBBLE_SPAWN_INTERVAL: 5000,
    BUBBLE_RISE_SPEED: 60,
    BUBBLE_RADIUS: 14,
    LOW_THRESHOLD: 25
  },

  CORAL: {
    COUNT: 15,
    MIN_SIZE: 30,
    MAX_SIZE: 60,
    COLORS: ['#FF5577', '#55AAFF', '#55FF99', '#BB77FF']
  },

  WRECK: {
    SUBMARINE_COUNT: 5,
    SHIP_COUNT: 3,
    SUB_SIZE: 80,
    SHIP_SIZE: 120
  },

  PLANKTON: {
    COUNT: 20,
    PARTICLES_PER_GROUP: 8,
    SPREAD: 50,
    SIZE: 3
  },

  TREASURE: {
    SIZE: 50,
    OPEN_ANIM_DURATION: 300,
    REWARDS: [
      { text: '+1 金币', value: 1, weight: 40 },
      { text: '+2 金币', value: 2, weight: 30 },
      { text: '+3 金币', value: 3, weight: 20 },
      { text: '+5 金币', value: 5, weight: 10 }
    ],
    FLOAT_TEXT_DURATION: 1500,
    FLOAT_TEXT_DISTANCE: 60
  },

  PARTICLE: {
    BUBBLE_BURST_COUNT: 6,
    DEFAULT_LIFETIME: 800,
    DEFAULT_SIZE: 5
  },

  COLORS: {
    DEEP_BLUE: '#0A2A3A',
    TEAL: '#1A6B7A',
    NEON_GREEN: '#00FF88',
    GOLD: '#FFD700',
    WOOD_DARK: '#6B4423',
    WOOD_LIGHT: '#8B5A2B',
    METAL_DARK: '#555555',
    METAL_LIGHT: '#888888',
    PLAYER: '#FFDD66'
  },

  OCEAN: {
    WAVE_SPEED: 0.5,
    WAVE_AMPLITUDE: 8
  }
} as const;

export type CoralColor = typeof CONFIG.CORAL.COLORS[number];
