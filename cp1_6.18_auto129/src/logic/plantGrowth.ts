export interface PlantParams {
  light: number;
  water: number;
  wind: number;
}

export interface StemSegment {
  id: string;
  height: number;
  radius: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface LeafData {
  id: string;
  stemIndex: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  length: number;
  width: number;
  side: 'left' | 'right';
}

export interface FlowerData {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  petalCount: number;
  petalSize: number;
}

export interface PlantGeometry {
  stems: StemSegment[];
  leaves: LeafData[];
  flower: FlowerData;
  totalHeight: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function generatePlantGeometry(params: PlantParams, progress: number): PlantGeometry {
  const lightFactor = params.light / 100;
  const waterFactor = params.water / 100;

  const combinedFactor = (lightFactor * 0.5 + waterFactor * 0.5);
  const baseHeight = lerp(1.2, 3.0, combinedFactor);
  const stemCount = Math.floor(lerp(3, 7, combinedFactor));
  const leafCount = Math.floor(lerp(2, 8, combinedFactor));
  const flowerSize = lerp(0.25, 0.6, combinedFactor);

  const stems: StemSegment[] = [];
  const leaves: LeafData[] = [];

  const growProgress = easeOutCubic(clamp(progress, 0, 1));
  const leafProgress = easeOutBack(clamp((progress - 0.25) / 0.6, 0, 1));
  const flowerProgress = easeOutBack(clamp((progress - 0.6) / 0.4, 0, 1));

  let currentY = 0;
  const segmentHeight = (baseHeight * growProgress) / stemCount;

  for (let i = 0; i < stemCount; i++) {
    const segProgress = clamp((progress * stemCount - i) / 1, 0, 1);
    const easedSeg = easeOutCubic(segProgress);
    const actualSegHeight = segmentHeight * easedSeg;
    stems.push({
      id: `stem_${i}`,
      height: actualSegHeight,
      radius: lerp(0.06, 0.03, i / stemCount),
      position: [0, currentY + actualSegHeight / 2, 0],
      rotation: [0, 0, 0],
    });
    currentY += actualSegHeight;
  }

  const totalHeight = baseHeight * growProgress;
  const effectiveLeaves = Math.floor(leafCount * clamp(progress * 1.5, 0, 1));

  for (let i = 0; i < leafCount; i++) {
    const t = (i + 1) / (leafCount + 1);
    const stemIndex = Math.min(Math.floor(t * stemCount), stemCount - 1);
    const heightAtLeaf = t * totalHeight;
    const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    const angleOffset = side === 'left' ? Math.PI * 0.8 : -Math.PI * 0.8;
    const rotationY = angleOffset + (i * 0.3);

    const individualProgress = clamp((leafProgress * leafCount - i) / 1, 0, 1);
    const easedLeaf = easeOutBack(individualProgress);
    const length = lerp(0.3, 0.65, combinedFactor) * easedLeaf;
    const width = lerp(0.12, 0.28, combinedFactor) * easedLeaf;

    if (i < effectiveLeaves) {
      leaves.push({
        id: `leaf_${i}`,
        stemIndex,
        position: [0, heightAtLeaf, 0],
        rotation: [-0.3, rotationY, side === 'left' ? 0.4 : -0.4],
        scale: [length, width, 1],
        length,
        width,
        side,
      });
    }
  }

  const flower: FlowerData = {
    id: 'flower_main',
    position: [0, totalHeight, 0],
    rotation: [0, 0, 0],
    scale: flowerSize * flowerProgress,
    petalCount: 6,
    petalSize: lerp(0.8, 1.2, combinedFactor),
  };

  return { stems, leaves, flower, totalHeight };
}
