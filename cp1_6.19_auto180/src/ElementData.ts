export interface Element {
  id: string;
  name: string;
  color: string;
  colorLight: string;
  isBasic: boolean;
}

export interface Recipe {
  inputs: [string, string];
  output: string;
}

export const ELEMENTS: Record<string, Element> = {
  fire: {
    id: 'fire',
    name: '火',
    color: '#FF4444',
    colorLight: '#FF8866',
    isBasic: true
  },
  water: {
    id: 'water',
    name: '水',
    color: '#4488FF',
    colorLight: '#66AAFF',
    isBasic: true
  },
  earth: {
    id: 'earth',
    name: '土',
    color: '#8B5A2B',
    colorLight: '#B8860B',
    isBasic: true
  },
  wind: {
    id: 'wind',
    name: '风',
    color: '#44DDDD',
    colorLight: '#88EEEE',
    isBasic: true
  },
  steam: {
    id: 'steam',
    name: '蒸汽',
    color: '#CCCCCC',
    colorLight: '#EEEEEE',
    isBasic: false
  },
  lava: {
    id: 'lava',
    name: '岩浆',
    color: '#FF6600',
    colorLight: '#FFAA33',
    isBasic: false
  },
  mud: {
    id: 'mud',
    name: '泥',
    color: '#6B4423',
    colorLight: '#8B6914',
    isBasic: false
  },
  dust: {
    id: 'dust',
    name: '尘',
    color: '#AA9977',
    colorLight: '#CCBB99',
    isBasic: false
  },
  lightning: {
    id: 'lightning',
    name: '雷',
    color: '#FFEE00',
    colorLight: '#FFFF66',
    isBasic: false
  },
  ice: {
    id: 'ice',
    name: '冰',
    color: '#88DDFF',
    colorLight: '#CCEEFF',
    isBasic: false
  },
  energy: {
    id: 'energy',
    name: '能量',
    color: '#FF00FF',
    colorLight: '#FF88FF',
    isBasic: false
  },
  metal: {
    id: 'metal',
    name: '金属',
    color: '#888888',
    colorLight: '#AAAAAA',
    isBasic: false
  },
  life: {
    id: 'life',
    name: '生命',
    color: '#44FF44',
    colorLight: '#88FF88',
    isBasic: false
  },
  crystal: {
    id: 'crystal',
    name: '水晶',
    color: '#FF88CC',
    colorLight: '#FFBBEE',
    isBasic: false
  },
  storm: {
    id: 'storm',
    name: '风暴',
    color: '#6666AA',
    colorLight: '#9999DD',
    isBasic: false
  },
  magma: {
    id: 'magma',
    name: '熔岩',
    color: '#DD3300',
    colorLight: '#FF6644',
    isBasic: false
  }
};

export const RECIPES: Recipe[] = [
  { inputs: ['fire', 'water'], output: 'steam' },
  { inputs: ['fire', 'earth'], output: 'lava' },
  { inputs: ['water', 'earth'], output: 'mud' },
  { inputs: ['earth', 'wind'], output: 'dust' },
  { inputs: ['fire', 'wind'], output: 'lightning' },
  { inputs: ['water', 'wind'], output: 'ice' },
  { inputs: ['fire', 'fire'], output: 'energy' },
  { inputs: ['earth', 'earth'], output: 'metal' },
  { inputs: ['water', 'mud'], output: 'life' },
  { inputs: ['earth', 'lava'], output: 'crystal' },
  { inputs: ['wind', 'lightning'], output: 'storm' },
  { inputs: ['fire', 'lava'], output: 'magma' },
  { inputs: ['ice', 'wind'], output: 'storm' },
  { inputs: ['mud', 'earth'], output: 'life' },
  { inputs: ['dust', 'fire'], output: 'energy' },
  { inputs: ['steam', 'fire'], output: 'energy' }
];

export const BASIC_ELEMENT_IDS: string[] = ['fire', 'water', 'earth', 'wind'];

export function getTotalElementCount(): number {
  return Object.keys(ELEMENTS).length;
}

export function getElementById(id: string): Element | undefined {
  return ELEMENTS[id];
}
