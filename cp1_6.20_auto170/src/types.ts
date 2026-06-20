export type PartName = 'head' | 'body' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

export type ActionTemplateId = 'idle' | 'walk' | 'attack' | 'cast' | 'hurt';

export interface Equipment {
  id: string;
  name: string;
  type: 'weapon' | 'armor';
  attack: number;
  defense: number;
  iconBase64: string;
  frameOverlayData: {
    targetPart: string;
    pixels: number[][];
  }[];
}

export interface ComposeRequest {
  parts: Record<PartName, number[][]>;
  equipmentIds: string[];
  actionTemplateId: ActionTemplateId;
}

export interface ComposeResponse {
  spriteSheetBase64: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  frameDelays: number[];
  actionName: string;
}

export interface PixelPartData {
  head: number[][];
  body: number[][];
  leftArm: number[][];
  rightArm: number[][];
  leftLeg: number[][];
  rightLeg: number[][];
}

export const PALETTE_COLORS = [
  '#000000',
  '#ffffff',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#ff00ff',
  '#ffa500',
  '#8b4513',
  '#888888',
];

export const PART_LABELS: Record<PartName, string> = {
  head: '头部',
  body: '躯干',
  leftArm: '左臂',
  rightArm: '右臂',
  leftLeg: '左腿',
  rightLeg: '右腿',
};

export const ACTION_LABELS: Record<ActionTemplateId, string> = {
  idle: '站立',
  walk: '行走',
  attack: '攻击',
  cast: '施法',
  hurt: '受伤',
};

export function createEmptyPart(): number[][] {
  return Array.from({ length: 16 }, () => Array(16).fill(-1));
}

export function createEmptyParts(): PixelPartData {
  return {
    head: createEmptyPart(),
    body: createEmptyPart(),
    leftArm: createEmptyPart(),
    rightArm: createEmptyPart(),
    leftLeg: createEmptyPart(),
    rightLeg: createEmptyPart(),
  };
}
