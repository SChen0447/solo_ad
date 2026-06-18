export const Config = {
  DEFAULT_PARTICLE_COUNT: 8000,
  PARTICLE_COUNT_MIN: 2000,
  PARTICLE_COUNT_MAX: 15000,
  PARTICLE_COUNT_STEP: 500,

  DEFAULT_ROTATION_SPEED: 0.5,
  ROTATION_SPEED_MIN: 0.1,
  ROTATION_SPEED_MAX: 2.0,
  ROTATION_SPEED_STEP: 0.1,

  DEFAULT_ATTRACT_STRENGTH: 1.5,
  ATTRACT_STRENGTH_MIN: 0,
  ATTRACT_STRENGTH_MAX: 5.0,
  ATTRACT_STRENGTH_STEP: 0.1,

  GALAXY_RADIUS: 200,
  GALAXY_THICKNESS: 12,
  GALAXY_ARMS: 4,
  GALAXY_TWIST: 2.5,

  PARTICLE_SIZE_CENTER: 0.8,
  PARTICLE_SIZE_EDGE: 0.2,

  RIPPLE_RADIUS: 50,
  RIPPLE_DURATION: 1000,

  HIGHLIGHT_SCALE: 2.0,
  HIGHLIGHT_COLOR: '#ffffff',

  COLOR_CENTER: '#ffaa33',
  COLOR_EDGE: '#3366ff',

  EXPLOSION_EXPAND_DURATION: 500,
  EXPLOSION_RECOVER_DURATION: 2000,
  EXPLOSION_EXPAND_RATIO: 2.0,

  CAMERA_DISTANCE: 300,
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 2000,
};

export type ColorTheme = 'gradient' | 'rainbow' | 'blue' | 'red';

export const ColorThemes: Record<ColorTheme, { center: string; edge: string }> = {
  gradient: { center: '#ffaa33', edge: '#3366ff' },
  rainbow: { center: '#ff66cc', edge: '#66ffcc' },
  blue: { center: '#66ccff', edge: '#0033aa' },
  red: { center: '#ff6666', edge: '#990033' },
};

export interface GalaxyParams {
  particleCount: number;
  rotationSpeed: number;
  attractStrength: number;
  colorTheme: ColorTheme;
}

export const DefaultGalaxyParams: GalaxyParams = {
  particleCount: Config.DEFAULT_PARTICLE_COUNT,
  rotationSpeed: Config.DEFAULT_ROTATION_SPEED,
  attractStrength: Config.DEFAULT_ATTRACT_STRENGTH,
  colorTheme: 'gradient',
};
