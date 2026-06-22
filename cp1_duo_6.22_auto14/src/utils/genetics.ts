export type FlowerColor = 'red' | 'yellow' | 'blue' | 'white' | 'orange' | 'green' | 'purple' | 'pink' | 'lightBlue' | 'lightYellow';

export type PetalShape = 'round' | 'pointed' | 'heart' | 'star';

export interface FlowerGenes {
  colorGene1: FlowerColor;
  colorGene2: FlowerColor;
  shapeGene1: PetalShape;
  shapeGene2: PetalShape;
  hasSpots: boolean;
  spotGene: boolean;
}

export interface FlowerData {
  id: string;
  color: FlowerColor;
  colorName: string;
  shape: PetalShape;
  shapeName: string;
  rarity: number;
  hasSpots: boolean;
  genes: FlowerGenes;
  parents?: string[];
}

const COLOR_NAMES: Record<FlowerColor, string> = {
  red: '红色',
  yellow: '黄色',
  blue: '蓝色',
  white: '白色',
  orange: '橙色',
  green: '绿色',
  purple: '紫色',
  pink: '粉色',
  lightBlue: '浅蓝',
  lightYellow: '浅黄'
};

const SHAPE_NAMES: Record<PetalShape, string> = {
  round: '圆润',
  pointed: '尖锐',
  heart: '心形',
  star: '星形'
};

const COLOR_VALUES: Record<FlowerColor, string> = {
  red: '#e74c3c',
  yellow: '#f1c40f',
  blue: '#3498db',
  white: '#ecf0f1',
  orange: '#e67e22',
  green: '#27ae60',
  purple: '#9b59b6',
  pink: '#ff69b4',
  lightBlue: '#87ceeb',
  lightYellow: '#fffacd'
};

function mixColor(c1: FlowerColor, c2: FlowerColor): FlowerColor {
  const colors = [c1, c2].sort();
  const key = colors.join('+');
  
  const mixMap: Record<string, FlowerColor> = {
    'red+yellow': 'orange',
    'blue+yellow': 'green',
    'blue+red': 'purple',
    'red+white': 'pink',
    'white+yellow': 'lightYellow',
    'blue+white': 'lightBlue',
    'orange+white': 'lightYellow',
    'green+white': 'lightBlue',
    'purple+white': 'pink'
  };
  
  if (mixMap[key]) return mixMap[key];
  if (c1 === c2) return c1;
  
  const dominantOrder: FlowerColor[] = ['purple', 'orange', 'green', 'red', 'yellow', 'blue', 'pink', 'lightBlue', 'lightYellow', 'white'];
  return dominantOrder.indexOf(c1) < dominantOrder.indexOf(c2) ? c1 : c2;
}

function mixShape(s1: PetalShape, s2: PetalShape): PetalShape {
  if (s1 === s2) return s1;
  
  const shapes = [s1, s2].sort();
  const key = shapes.join('+');
  
  const mixMap: Record<string, PetalShape> = {
    'pointed+round': 'heart',
    'round+star': 'heart',
    'pointed+star': 'star',
    'heart+round': 'round',
    'heart+star': 'star',
    'heart+pointed': 'pointed'
  };
  
  return mixMap[key] || s1;
}

function calculateRarity(color: FlowerColor, shape: PetalShape, hasSpots: boolean): number {
  let rarity = 1;
  
  const rareColors: FlowerColor[] = ['orange', 'green', 'purple', 'pink', 'lightBlue', 'lightYellow'];
  if (rareColors.includes(color)) rarity += 1;
  
  const rareShapes: PetalShape[] = ['heart', 'star'];
  if (rareShapes.includes(shape)) rarity += 1;
  
  if (hasSpots) rarity += 0;
  
  return Math.min(3, rarity);
}

function generateFlowerId(genes: FlowerGenes): string {
  const color = mixColor(genes.colorGene1, genes.colorGene2);
  const shape = mixShape(genes.shapeGene1, genes.shapeGene2);
  const spots = genes.hasSpots ? 'spotted' : 'plain';
  return `${color}_${shape}_${spots}`;
}

export function createFlower(
  colorGene1: FlowerColor,
  colorGene2: FlowerColor,
  shapeGene1: PetalShape,
  shapeGene2: PetalShape,
  hasSpots: boolean,
  spotGene: boolean,
  parents?: string[]
): FlowerData {
  const color = mixColor(colorGene1, colorGene2);
  const shape = mixShape(shapeGene1, shapeGene2);
  const rarity = calculateRarity(color, shape, hasSpots);
  
  const genes: FlowerGenes = {
    colorGene1,
    colorGene2,
    shapeGene1,
    shapeGene2,
    hasSpots,
    spotGene
  };
  
  return {
    id: generateFlowerId(genes),
    color,
    colorName: COLOR_NAMES[color],
    shape,
    shapeName: SHAPE_NAMES[shape],
    rarity,
    hasSpots,
    genes,
    parents
  };
}

export function crossBreed(flower1: FlowerData, flower2: FlowerData): FlowerData {
  const startTime = performance.now();
  
  const getRandomGene = <T>(g1: T, g2: T): T => Math.random() < 0.5 ? g1 : g2;
  
  const colorGene1 = getRandomGene(flower1.genes.colorGene1, flower1.genes.colorGene2);
  const colorGene2 = getRandomGene(flower2.genes.colorGene1, flower2.genes.colorGene2);
  
  const shapeGene1 = getRandomGene(flower1.genes.shapeGene1, flower1.genes.shapeGene2);
  const shapeGene2 = getRandomGene(flower2.genes.shapeGene1, flower2.genes.shapeGene2);
  
  const spotGene1 = flower1.genes.spotGene || flower1.genes.hasSpots;
  const spotGene2 = flower2.genes.spotGene || flower2.genes.hasSpots;
  
  const hasSpots = spotGene1 && spotGene2 ? true : (spotGene1 || spotGene2 ? Math.random() < 0.3 : false);
  const spotGene = spotGene1 || spotGene2 || hasSpots;
  
  const result = createFlower(
    colorGene1,
    colorGene2,
    shapeGene1,
    shapeGene2,
    hasSpots,
    spotGene,
    [flower1.id, flower2.id]
  );
  
  const endTime = performance.now();
  console.log(`[Genetics] 杂交计算耗时: ${(endTime - startTime).toFixed(2)}ms`);
  
  return result;
}

export function getBaseFlowers(): FlowerData[] {
  return [
    createFlower('red', 'red', 'round', 'round', false, false),
    createFlower('red', 'red', 'pointed', 'pointed', false, false),
    createFlower('yellow', 'yellow', 'round', 'round', false, false),
    createFlower('yellow', 'yellow', 'pointed', 'pointed', false, false),
    createFlower('blue', 'blue', 'round', 'round', false, false),
    createFlower('blue', 'blue', 'pointed', 'pointed', false, false),
    createFlower('white', 'white', 'round', 'round', false, false),
    createFlower('white', 'white', 'pointed', 'pointed', false, false)
  ];
}

export function getColorValue(color: FlowerColor): string {
  return COLOR_VALUES[color];
}

export function getColorName(color: FlowerColor): string {
  return COLOR_NAMES[color];
}

export function getShapeName(shape: PetalShape): string {
  return SHAPE_NAMES[shape];
}

export function getAllPossibleFlowers(): FlowerData[] {
  const colors: FlowerColor[] = ['red', 'yellow', 'blue', 'white', 'orange', 'green', 'purple', 'pink', 'lightBlue', 'lightYellow'];
  const shapes: PetalShape[] = ['round', 'pointed', 'heart', 'star'];
  const flowers: FlowerData[] = [];
  
  for (const c1 of colors) {
    for (const c2 of colors) {
      for (const s1 of shapes) {
        for (const s2 of shapes) {
          for (const hasSpots of [false, true]) {
            for (const spotGene of [false, true]) {
              const flower = createFlower(c1, c2, s1, s2, hasSpots, spotGene);
              if (!flowers.find(f => f.id === flower.id)) {
                flowers.push(flower);
              }
            }
          }
        }
      }
    }
  }
  
  return flowers;
}

export function getThreeStarFlowers(): FlowerData[] {
  return getAllPossibleFlowers().filter(f => f.rarity === 3);
}
