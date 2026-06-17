import { MaterialType, MaterialConfig, BlockData } from './types';

export const MATERIAL_CONFIGS: Record<MaterialType, MaterialConfig> = {
  wood: {
    color: '#b08d5b',
    strokeColor: '#8a6d3b',
    iconColor: '#b08d5b',
    weight: 3,
    restitution: 0.2,
    friction: 0.8,
    density: 0.003,
    label: 'Wood',
    width: 40,
    height: 40,
  },
  iron: {
    color: '#777777',
    strokeColor: '#555555',
    iconColor: '#777777',
    weight: 8,
    restitution: 0.4,
    friction: 0.5,
    density: 0.008,
    label: 'Iron',
    width: 35,
    height: 35,
  },
  glass: {
    color: 'rgba(136,204,255,0.4)',
    strokeColor: '#88ccff',
    iconColor: '#88ccff',
    weight: 1,
    restitution: 0.1,
    friction: 0.2,
    density: 0.001,
    label: 'Glass',
    width: 30,
    height: 50,
  },
  explosive: {
    color: '#ff4444',
    strokeColor: '#cc2222',
    iconColor: '#ff4444',
    weight: 3,
    restitution: 0.15,
    friction: 0.6,
    density: 0.003,
    label: 'Explosive',
    width: 36,
    height: 36,
  },
  launcher: {
    color: '#aa66ff',
    strokeColor: '#8844dd',
    iconColor: '#aa66ff',
    weight: 5,
    restitution: 0.8,
    friction: 0.3,
    density: 0.005,
    label: 'Launcher',
    width: 50,
    height: 20,
  },
};

const MATERIAL_WEIGHTS: Array<{ type: MaterialType; weight: number }> = [
  { type: 'wood', weight: 35 },
  { type: 'iron', weight: 25 },
  { type: 'glass', weight: 20 },
  { type: 'explosive', weight: 10 },
  { type: 'launcher', weight: 10 },
];

function randomMaterial(): MaterialType {
  const total = MATERIAL_WEIGHTS.reduce((s, m) => s + m.weight, 0);
  let r = Math.random() * total;
  for (const m of MATERIAL_WEIGHTS) {
    r -= m.weight;
    if (r <= 0) return m.type;
  }
  return 'wood';
}

export function generateBlockId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function calculateEnergyTransfer(currentEnergy: number): number {
  return currentEnergy * 0.8;
}

export function canTransferEnergy(energy: number): boolean {
  return energy >= 10;
}

export function generateMirrorScene(sceneWidth: number, sceneHeight: number): BlockData[] {
  const blocks: BlockData[] = [];
  const margin = 80;
  const centerX = sceneWidth / 2;
  const areaLeft = margin;
  const areaRight = sceneWidth - margin;
  const areaTop = margin;
  const areaBottom = sceneHeight - margin;
  const halfWidth = (areaRight - areaLeft) / 2;
  const colSpacing = 55;
  const rowSpacing = 55;
  const colsPerSide = Math.floor(halfWidth / colSpacing);
  const totalRows = Math.floor((areaBottom - areaTop) / rowSpacing);

  let count = 0;
  const targetCount = 52;
  let row = 0;

  while (count < targetCount && row < totalRows) {
    for (let col = 0; col < colsPerSide && count < targetCount; col++) {
      const xOffset = col * colSpacing + colSpacing / 2;
      const y = areaTop + row * rowSpacing + rowSpacing / 2;

      const material = randomMaterial();
      const config = MATERIAL_CONFIGS[material];

      const leftX = centerX - xOffset;
      const rightX = centerX + xOffset;

      blocks.push({
        id: generateBlockId(),
        material,
        x: leftX,
        y,
        width: config.width,
        height: config.height,
        energy: 100,
      });
      count++;

      if (count < targetCount) {
        const material2 = randomMaterial();
        const config2 = MATERIAL_CONFIGS[material2];
        blocks.push({
          id: generateBlockId(),
          material: material2,
          x: rightX,
          y,
          width: config2.width,
          height: config2.height,
          energy: 100,
        });
        count++;
      }
    }
    row++;
  }

  return blocks;
}

export function generateSpiralScene(sceneWidth: number, sceneHeight: number): BlockData[] {
  const blocks: BlockData[] = [];
  const centerX = sceneWidth / 2;
  const centerY = sceneHeight / 2;
  const margin = 80;
  const maxRadius = Math.min(sceneWidth, sceneHeight) / 2 - margin;
  const targetCount = 55;
  const a = 8;
  const b = 3;
  const angleStep = (2 * Math.PI) / 8;

  for (let i = 0; i < targetCount; i++) {
    const theta = i * angleStep;
    const r = a + b * theta;
    if (r > maxRadius) break;

    const x = centerX + r * Math.cos(theta);
    const y = centerY + r * Math.sin(theta);

    const material = randomMaterial();
    const config = MATERIAL_CONFIGS[material];

    blocks.push({
      id: generateBlockId(),
      material,
      x,
      y,
      width: config.width,
      height: config.height,
      energy: 100,
    });
  }

  return blocks;
}

function blocksOverlap(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number,
  padding: number,
): boolean {
  return (
    x1 - w1 / 2 - padding < x2 + w2 / 2 + padding &&
    x1 + w1 / 2 + padding > x2 - w2 / 2 - padding &&
    y1 - h1 / 2 - padding < y2 + h2 / 2 + padding &&
    y1 + h1 / 2 + padding > y2 - h2 / 2 - padding
  );
}

export function generateRandomScene(sceneWidth: number, sceneHeight: number): BlockData[] {
  const blocks: BlockData[] = [];
  const margin = 80;
  const targetCount = 55;
  const minSpacing = 20;
  const maxAttempts = 2000;

  for (let i = 0; i < targetCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const material = randomMaterial();
      const config = MATERIAL_CONFIGS[material];
      const x = margin + config.width / 2 + Math.random() * (sceneWidth - 2 * margin - config.width);
      const y = margin + config.height / 2 + Math.random() * (sceneHeight - 2 * margin - config.height);

      let overlapping = false;
      for (const b of blocks) {
        if (blocksOverlap(x, y, config.width, config.height, b.x, b.y, b.width, b.height, minSpacing / 2)) {
          overlapping = true;
          break;
        }
      }

      if (!overlapping) {
        blocks.push({
          id: generateBlockId(),
          material,
          x,
          y,
          width: config.width,
          height: config.height,
          energy: 100,
        });
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }

  return blocks;
}

export function generateScene(
  type: 'mirror' | 'spiral' | 'random',
  sceneWidth: number,
  sceneHeight: number,
): BlockData[] {
  switch (type) {
    case 'mirror':
      return generateMirrorScene(sceneWidth, sceneHeight);
    case 'spiral':
      return generateSpiralScene(sceneWidth, sceneHeight);
    case 'random':
      return generateRandomScene(sceneWidth, sceneHeight);
  }
}
