export type BaseType = 'A' | 'T' | 'C' | 'G';

export interface BaseInfo {
  name: string;
  fullName: string;
  color: number;
  pair: BaseType;
  hydrogenBonds: number;
}

export interface BasePairData {
  index: number;
  baseA: BaseType;
  baseB: BaseType;
  colorA: number;
  colorB: number;
  positionA: { x: number; y: number; z: number };
  positionB: { x: number; y: number; z: number };
  hydrogenDirection: { x: number; y: number; z: number };
  hydrogenBonds: number;
}

export const BASE_INFO_MAP: Record<BaseType, BaseInfo> = {
  A: {
    name: 'A',
    fullName: '腺嘌呤 (Adenine)',
    color: 0x4fc3f7,
    pair: 'T',
    hydrogenBonds: 2
  },
  T: {
    name: 'T',
    fullName: '胸腺嘧啶 (Thymine)',
    color: 0xef5350,
    pair: 'A',
    hydrogenBonds: 2
  },
  C: {
    name: 'C',
    fullName: '胞嘧啶 (Cytosine)',
    color: 0x66bb6a,
    pair: 'G',
    hydrogenBonds: 3
  },
  G: {
    name: 'G',
    fullName: '鸟嘌呤 (Guanine)',
    color: 0xffa726,
    pair: 'C',
    hydrogenBonds: 3
  }
};

export const BACKBONE_COLOR = 0x7c4dff;
export const HIGHLIGHT_COLOR = 0xffeb3b;
export const HYDROGEN_BOND_COLOR = 0xffffff;

export const ATOM_RADIUS = {
  backbone: 0.15,
  base: 0.12,
  baseHeight: 0.5
};

export const HELIX_CONFIG = {
  radius: 2.0,
  basePairsPerTurn: 10,
  verticalPitch: 0.34,
  hydrogenBondLength: 1.8
};

export const ANIMATION_CONFIG = {
  transitionDuration: 800,
  clickAnimationDuration: 300,
  highlightPullDuration: 500,
  highlightPullDistance: 2.0,
  defaultRotateSpeed: 0.5
};

export const isBaseType = (char: string): char is BaseType => {
  return char === 'A' || char === 'T' || char === 'C' || char === 'G';
};

export const getComplement = (base: BaseType): BaseType => {
  return BASE_INFO_MAP[base].pair;
};
