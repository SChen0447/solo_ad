export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 600;
export const PANEL_WIDTH = 200;
export const OCEAN_SURFACE_Y = 0;

export const BG_COLOR_TOP = '#0b3d60';
export const BG_COLOR_BOTTOM = '#0b6e8f';
export const DEEP_SEA_BLUE = '#0a2a40';
export const CORAL_ORANGE = '#ff7f50';
export const CYAN_BORDER = '#00d4ff';
export const SEAWEED_GREEN = '#228b22';

export const FISH_COLOR = '#4a9eff';
export const FISH_RADIUS = 6;
export const FISH_COUNT = 75;
export const FISH_SEPARATION = 35;
export const FISH_MAX_SPEED = 3;
export const FISH_TRAIL_WIDTH = 3;
export const FISH_TRAIL_LENGTH = 15;

export const JELLYFISH_COLOR = 'rgba(255, 150, 180, 0.6)';
export const JELLYFISH_RADIUS = 12;
export const JELLYFISH_COUNT = 10;
export const JELLYFISH_DRIFT_SPEED = 0.5;
export const JELLYFISH_TRAIL_WIDTH = 2;
export const JELLYFISH_TRAIL_LENGTH = 15;

export const TURTLE_COLOR = '#2ecc71';
export const TURTLE_RADIUS = 20;
export const TURTLE_COUNT = 2;
export const TURTLE_CATCH_RANGE = 40;
export const TURTLE_PATROL_SPEED = 1.2;
export const TURTLE_TRAIL_WIDTH = 4;
export const TURTLE_TRAIL_LENGTH = 15;

export const CORAL_COUNT = 10;
export const CORAL_MIN_SIZE = 30;
export const CORAL_MAX_SIZE = 60;
export const SEAWEED_COUNT = 15;
export const SEAWEED_MIN_HEIGHT = 40;
export const SEAWEED_MAX_HEIGHT = 80;

export const OBSTACLE_AVOIDANCE_RADIUS = 25;

export const BOID_COHESION_WEIGHT = 0.005;
export const BOID_ALIGNMENT_WEIGHT = 0.05;
export const BOID_SEPARATION_WEIGHT = 0.05;
export const BOID_PERCEPTION_RADIUS = 80;

export const TRAIL_FADE_START = '#ffffff44';
export const TRAIL_FADE_END = 'transparent';

export const ANIMATION_DURATION = 300;

export interface GlobalParams {
  fishSeparation: number;
  fishMaxSpeed: number;
  jellyfishDensity: number;
  turtleCount: number;
}

export const DEFAULT_PARAMS: GlobalParams = {
  fishSeparation: FISH_SEPARATION,
  fishMaxSpeed: FISH_MAX_SPEED,
  jellyfishDensity: JELLYFISH_COUNT,
  turtleCount: TURTLE_COUNT,
};
