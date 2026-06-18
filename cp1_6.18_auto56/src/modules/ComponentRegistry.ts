export type ComponentType = 'speed' | 'bounce' | 'teleport' | 'gravity';

export interface ComponentParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ComponentDef {
  type: ComponentType;
  name: string;
  icon: string;
  color: string;
  glowColor: string;
  params: ComponentParamDef[];
  activate: (player: PlayerState, params: Record<string, number>, gridX: number, gridY: number) => PlayerState;
}

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  gridX: number;
  gridY: number;
  params: Record<string, number>;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  gravityReversed: boolean;
  scaleX: number;
  scaleY: number;
}

export interface PrototypeData {
  name: string;
  timestamp: number;
  components: PlacedComponent[];
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 40;
export const GRID_COLS = CANVAS_WIDTH / GRID_SIZE;
export const GRID_ROWS = CANVAS_HEIGHT / GRID_SIZE;

const speedActivate: ComponentDef['activate'] = (player, params) => {
  const multiplier = params.multiplier ?? 1.5;
  return {
    ...player,
    vx: player.vx * multiplier,
  };
};

const bounceActivate: ComponentDef['activate'] = (player, params) => {
  const force = params.force ?? 5;
  return {
    ...player,
    vy: player.gravityReversed ? Math.abs(force) : -Math.abs(force),
    onGround: false,
    scaleY: 1.3,
    scaleX: 0.7,
  };
};

const teleportActivate: ComponentDef['activate'] = (player, params, gridX, gridY) => {
  const distance = params.distance ?? 100;
  const direction = player.vx >= 0 ? 1 : -1;
  const newX = gridX * GRID_SIZE + GRID_SIZE / 2 + direction * distance;
  return {
    ...player,
    x: Math.max(player.width / 2, Math.min(CANVAS_WIDTH - player.width / 2, newX)),
    scaleX: 0.3,
    scaleY: 1.4,
  };
};

const gravityActivate: ComponentDef['activate'] = (player) => {
  return {
    ...player,
    gravityReversed: !player.gravityReversed,
    vy: player.gravityReversed ? 2 : -2,
    onGround: false,
    scaleX: 1.2,
    scaleY: 0.8,
  };
};

export const COMPONENT_DEFS: ComponentDef[] = [
  {
    type: 'speed',
    name: '速度修改器',
    icon: '⚡',
    color: '#9b5de5',
    glowColor: 'rgba(155, 93, 229, 0.6)',
    params: [
      { key: 'multiplier', label: '速度倍率', min: 0.5, max: 3, step: 0.1, default: 1.5 },
    ],
    activate: speedActivate,
  },
  {
    type: 'bounce',
    name: '弹跳板',
    icon: '🔶',
    color: '#00f5d4',
    glowColor: 'rgba(0, 245, 212, 0.6)',
    params: [
      { key: 'force', label: '弹力系数', min: 1, max: 10, step: 0.5, default: 5 },
    ],
    activate: bounceActivate,
  },
  {
    type: 'teleport',
    name: '传送门',
    icon: '🌀',
    color: '#f15bb5',
    glowColor: 'rgba(241, 91, 181, 0.6)',
    params: [
      { key: 'distance', label: '传送距离(px)', min: 50, max: 200, step: 10, default: 120 },
    ],
    activate: teleportActivate,
  },
  {
    type: 'gravity',
    name: '重力反转器',
    icon: '🔄',
    color: '#fee440',
    glowColor: 'rgba(254, 228, 64, 0.6)',
    params: [
      { key: 'duration', label: '持续时间(s)', min: 1, max: 5, step: 0.5, default: 3 },
    ],
    activate: gravityActivate,
  },
];

export function getComponentDef(type: ComponentType): ComponentDef | undefined {
  return COMPONENT_DEFS.find((d) => d.type === type);
}

export function getDefaultParams(type: ComponentType): Record<string, number> {
  const def = getComponentDef(type);
  if (!def) return {};
  const params: Record<string, number> = {};
  for (const p of def.params) {
    params[p.key] = p.default;
  }
  return params;
}
