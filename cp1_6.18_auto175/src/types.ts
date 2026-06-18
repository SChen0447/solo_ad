export type Coordinate = {
  x: number;
  y: number;
};

export type ObstacleType = 'rock' | 'low_wall' | 'high_wall';

export type CharacterColor = 'red' | 'blue' | 'yellow';

export type ToolType = ObstacleType | CharacterColor | null;

export interface Obstacle {
  id: string;
  type: ObstacleType;
  position: Coordinate;
  height: number;
  isDamaged: boolean;
  isNew: boolean;
}

export interface Character {
  id: string;
  color: CharacterColor;
  position: Coordinate;
  bounceCount: number;
  isActive: boolean;
  isHit: boolean;
  isNew: boolean;
}

export type HitReason =
  | 'target_hit'
  | 'obstacle_blocked'
  | 'out_of_bounds'
  | 'no_bounce_left'
  | 'reached_end';

export interface BallisticResult {
  path: Coordinate[];
  pathSegments: { start: Coordinate; end: Coordinate }[];
  hitTarget: Character | null;
  hitObstacle: Obstacle | null;
  bouncePoints: Coordinate[];
  obstaclesPassed: Obstacle[];
  reason: HitReason;
}

export interface ShootLog {
  id: string;
  timestamp: string;
  startPoint: Coordinate;
  endPoint: Coordinate;
  obstaclesPassed: { type: ObstacleType; position: Coordinate }[];
  hitResult: string;
  bounceUsed: number;
  bouncePoints: Coordinate[];
}

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 15;

export const OBSTACLE_HEIGHTS: Record<ObstacleType, number> = {
  rock: 0,
  low_wall: 1,
  high_wall: 2,
};

export const BULLET_HEIGHT = 1.5;
