import {
  type StarData,
  type StarLayerData,
  calculateTemperatureGradient,
  calculateDensityGradient,
} from './starPhysics';

const LAYER_NAMES = ['核心', '辐射层', '对流层', '光球层'] as const;

const LAYER_COLORS: Record<string, { color: string; emissive: string }> = {
  '核心': { color: '#ff6b35', emissive: '#ff4500' },
  '辐射层': { color: '#ffaa33', emissive: '#ff8800' },
  '对流层': { color: '#ffd466', emissive: '#ffcc00' },
  '光球层': { color: '#fff8dc', emissive: '#ffeebb' },
};

interface StarTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  radius: number;
  displayRadius: number;
  coreTemp: number;
  surfaceTemp: number;
  coreDensity: number;
  surfaceDensity: number;
  layerFractions: number[];
  compositions: Record<string, { element: string; percentage: number }[]>;
}

const STAR_TEMPLATES: StarTemplate[] = [
  {
    id: 'red-dwarf',
    name: '红矮星',
    type: 'M型主序星',
    description: '最小最冷的主序星，寿命可达数万亿年',
    radius: 0.2,
    displayRadius: 1.2,
    coreTemp: 5000000,
    surfaceTemp: 3000,
    coreDensity: 50,
    surfaceDensity: 0.001,
    layerFractions: [0.15, 0.40, 0.75, 1.0],
    compositions: {
      '核心': [{ element: 'H', percentage: 70 }, { element: 'He', percentage: 28 }, { element: '其他', percentage: 2 }],
      '辐射层': [{ element: 'H', percentage: 73 }, { element: 'He', percentage: 25 }, { element: '其他', percentage: 2 }],
      '对流层': [{ element: 'H', percentage: 75 }, { element: 'He', percentage: 23 }, { element: '其他', percentage: 2 }],
      '光球层': [{ element: 'H', percentage: 78 }, { element: 'He', percentage: 20 }, { element: '其他', percentage: 2 }],
    },
  },
  {
    id: 'yellow-dwarf',
    name: '黄矮星',
    type: 'G型主序星',
    description: '与太阳同类型的中等质量恒星',
    radius: 1.0,
    displayRadius: 1.8,
    coreTemp: 15000000,
    surfaceTemp: 5778,
    coreDensity: 150,
    surfaceDensity: 0.0002,
    layerFractions: [0.20, 0.50, 0.80, 1.0],
    compositions: {
      '核心': [{ element: 'He', percentage: 65 }, { element: 'H', percentage: 33 }, { element: '其他', percentage: 2 }],
      '辐射层': [{ element: 'H', percentage: 70 }, { element: 'He', percentage: 28 }, { element: '其他', percentage: 2 }],
      '对流层': [{ element: 'H', percentage: 74 }, { element: 'He', percentage: 24 }, { element: '其他', percentage: 2 }],
      '光球层': [{ element: 'H', percentage: 74 }, { element: 'He', percentage: 24 }, { element: '其他', percentage: 2 }],
    },
  },
  {
    id: 'blue-giant',
    name: '蓝巨星',
    type: 'O/B型巨星',
    description: '质量巨大、光度极高的炽热恒星',
    radius: 10.0,
    displayRadius: 2.5,
    coreTemp: 30000000,
    surfaceTemp: 25000,
    coreDensity: 5,
    surfaceDensity: 0.00001,
    layerFractions: [0.10, 0.35, 0.70, 1.0],
    compositions: {
      '核心': [{ element: 'He', percentage: 50 }, { element: 'C', percentage: 30 }, { element: 'O', percentage: 15 }, { element: '其他', percentage: 5 }],
      '辐射层': [{ element: 'H', percentage: 65 }, { element: 'He', percentage: 32 }, { element: '其他', percentage: 3 }],
      '对流层': [{ element: 'H', percentage: 70 }, { element: 'He', percentage: 28 }, { element: '其他', percentage: 2 }],
      '光球层': [{ element: 'H', percentage: 72 }, { element: 'He', percentage: 26 }, { element: '其他', percentage: 2 }],
    },
  },
  {
    id: 'white-dwarf',
    name: '白矮星',
    type: '致密星',
    description: '恒星演化末期的致密残骸，体积小密度极高',
    radius: 0.01,
    displayRadius: 0.8,
    coreTemp: 20000000,
    surfaceTemp: 10000,
    coreDensity: 1000000,
    surfaceDensity: 100,
    layerFractions: [0.40, 0.65, 0.85, 1.0],
    compositions: {
      '核心': [{ element: 'C', percentage: 50 }, { element: 'O', percentage: 45 }, { element: 'Ne', percentage: 5 }],
      '辐射层': [{ element: 'He', percentage: 60 }, { element: 'C', percentage: 35 }, { element: '其他', percentage: 5 }],
      '对流层': [{ element: 'He', percentage: 80 }, { element: 'H', percentage: 18 }, { element: '其他', percentage: 2 }],
      '光球层': [{ element: 'H', percentage: 85 }, { element: 'He', percentage: 14 }, { element: '其他', percentage: 1 }],
    },
  },
];

function buildLayers(template: StarTemplate): StarLayerData[] {
  return LAYER_NAMES.map((name, i) => {
    const fraction = template.layerFractions[i];
    const prevFraction = i > 0 ? template.layerFractions[i - 1] : 0;
    const midFraction = (fraction + prevFraction) / 2;
    const temp = calculateTemperatureGradient(template.coreTemp, template.surfaceTemp, midFraction);
    const density = calculateDensityGradient(template.coreDensity, template.surfaceDensity, midFraction);
    const colorInfo = LAYER_COLORS[name];

    return {
      name,
      radiusFraction: fraction,
      temperature: Math.round(temp),
      density: parseFloat(density.toExponential(2)),
      composition: template.compositions[name],
      color: colorInfo.color,
      emissiveColor: colorInfo.emissive,
    };
  });
}

export function getStarList(): StarData[] {
  return STAR_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    description: t.description,
    radius: t.radius,
    displayRadius: t.displayRadius,
    layers: buildLayers(t),
  }));
}

export function getStarById(id: string): StarData | undefined {
  return getStarList().find((s) => s.id === id);
}
