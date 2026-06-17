import { Unit, Formation, UnitType } from './types';

export const UNITS: Record<UnitType, Unit> = {
  cavalry: {
    id: 'cavalry',
    type: 'cavalry',
    name: '骑兵',
    color: '#E74C3C'
  },
  infantry: {
    id: 'infantry',
    type: 'infantry',
    name: '步兵',
    color: '#3498DB'
  },
  archer: {
    id: 'archer',
    type: 'archer',
    name: '弓兵',
    color: '#2ECC71'
  }
};

export const UNIT_LIST: Unit[] = Object.values(UNITS);

export const FORMATIONS: Formation[] = [
  {
    id: 'square',
    name: '方阵',
    description: '3x3密集方阵，攻守兼备',
    pattern: [
      { offset: { q: -1, r: -1 }, unitType: 'infantry' },
      { offset: { q: 0, r: -1 }, unitType: 'infantry' },
      { offset: { q: 1, r: -1 }, unitType: 'infantry' },
      { offset: { q: -1, r: 0 }, unitType: 'cavalry' },
      { offset: { q: 0, r: 0 }, unitType: 'infantry' },
      { offset: { q: 1, r: 0 }, unitType: 'cavalry' },
      { offset: { q: -1, r: 1 }, unitType: 'infantry' },
      { offset: { q: 0, r: 1 }, unitType: 'infantry' },
      { offset: { q: 1, r: 1 }, unitType: 'infantry' }
    ],
    thumbnailPattern: [
      { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 },
      { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 },
      { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 }
    ]
  },
  {
    id: 'vanguard',
    name: '锋矢阵',
    description: '箭头阵型，骑兵在前突击',
    pattern: [
      { offset: { q: 0, r: -2 }, unitType: 'cavalry' },
      { offset: { q: -1, r: -1 }, unitType: 'cavalry' },
      { offset: { q: 0, r: -1 }, unitType: 'infantry' },
      { offset: { q: 1, r: -1 }, unitType: 'cavalry' },
      { offset: { q: -1, r: 0 }, unitType: 'infantry' },
      { offset: { q: 0, r: 0 }, unitType: 'infantry' },
      { offset: { q: 1, r: 0 }, unitType: 'infantry' },
      { offset: { q: 0, r: 1 }, unitType: 'archer' }
    ],
    thumbnailPattern: [
      { q: 0, r: -2 },
      { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 },
      { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 },
      { q: 0, r: 1 }
    ]
  },
  {
    id: 'wildgoose',
    name: '雁行阵',
    description: 'V字阵型，弓兵在后输出',
    pattern: [
      { offset: { q: -2, r: 0 }, unitType: 'archer' },
      { offset: { q: -1, r: -1 }, unitType: 'cavalry' },
      { offset: { q: -1, r: 0 }, unitType: 'infantry' },
      { offset: { q: 0, r: -1 }, unitType: 'infantry' },
      { offset: { q: 0, r: 0 }, unitType: 'infantry' },
      { offset: { q: 1, r: -1 }, unitType: 'cavalry' },
      { offset: { q: 1, r: 0 }, unitType: 'infantry' },
      { offset: { q: 2, r: 0 }, unitType: 'archer' }
    ],
    thumbnailPattern: [
      { q: -2, r: 0 },
      { q: -1, r: -1 }, { q: -1, r: 0 },
      { q: 0, r: -1 }, { q: 0, r: 0 },
      { q: 1, r: -1 }, { q: 1, r: 0 },
      { q: 2, r: 0 }
    ]
  }
];

export function getUnitByType(type: UnitType): Unit {
  return UNITS[type];
}

export function getFormationById(id: string): Formation | undefined {
  return FORMATIONS.find(f => f.id === id);
}
