import { eventBus } from '../eventBus';

const BUILDING_WIDTH = 40;
const BUILDING_DEPTH = 30;
const FLOOR_HEIGHT = 30;
const WALL_THICKNESS = 1;
const TOTAL_HEIGHT = FLOOR_HEIGHT * 3;

interface ContourPolygon {
  points: { x: number; y: number }[];
  type: 'wall' | 'door' | 'window' | 'stair' | 'floor';
  isOpening?: boolean;
}

interface SectionData {
  polygons: ContourPolygon[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  cutHeight: number;
}

interface WallRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  type: 'wall' | 'door' | 'window' | 'stair' | 'floor';
  isOpening?: boolean;
}

const wallRects: WallRect[] = [];

function initWallRects() {
  for (let floor = 0; floor < 3; floor++) {
    const yBase = floor * FLOOR_HEIGHT;
    const yTop = (floor + 1) * FLOOR_HEIGHT;

    wallRects.push({
      minX: -BUILDING_WIDTH / 2,
      maxX: BUILDING_WIDTH / 2,
      minZ: BUILDING_DEPTH / 2 - WALL_THICKNESS / 2,
      maxZ: BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
      minY: yBase,
      maxY: yTop,
      type: 'wall'
    });

    wallRects.push({
      minX: -BUILDING_WIDTH / 2,
      maxX: BUILDING_WIDTH / 2,
      minZ: -BUILDING_DEPTH / 2 - WALL_THICKNESS / 2,
      maxZ: -BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
      minY: yBase,
      maxY: yTop,
      type: 'wall'
    });

    wallRects.push({
      minX: BUILDING_WIDTH / 2 - WALL_THICKNESS / 2,
      maxX: BUILDING_WIDTH / 2 + WALL_THICKNESS / 2,
      minZ: -BUILDING_DEPTH / 2,
      maxZ: BUILDING_DEPTH / 2,
      minY: yBase,
      maxY: yTop,
      type: 'wall'
    });

    wallRects.push({
      minX: -BUILDING_WIDTH / 2 - WALL_THICKNESS / 2,
      maxX: -BUILDING_WIDTH / 2 + WALL_THICKNESS / 2,
      minZ: -BUILDING_DEPTH / 2,
      maxZ: BUILDING_DEPTH / 2,
      minY: yBase,
      maxY: yTop,
      type: 'wall'
    });

    wallRects.push({
      minX: -5 - WALL_THICKNESS / 2,
      maxX: -5 + WALL_THICKNESS / 2,
      minZ: -(BUILDING_DEPTH - 4) / 2,
      maxZ: (BUILDING_DEPTH - 4) / 2,
      minY: yBase,
      maxY: yTop,
      type: 'wall'
    });

    wallRects.push({
      minX: -(BUILDING_WIDTH - 15) / 2,
      maxX: (BUILDING_WIDTH - 15) / 2,
      minZ: 5 - WALL_THICKNESS / 2,
      maxZ: 5 + WALL_THICKNESS / 2,
      minY: yBase,
      maxY: yTop,
      type: 'wall'
    });

    if (floor === 0) {
      wallRects.push({
        minX: -1.5,
        maxX: 1.5,
        minZ: BUILDING_DEPTH / 2 - WALL_THICKNESS / 2,
        maxZ: BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
        minY: yBase,
        maxY: yBase + 8,
        type: 'door',
        isOpening: true
      });
    }

    if (floor >= 1) {
      wallRects.push({
        minX: -5 - WALL_THICKNESS / 2 - 1.5,
        maxX: -5 - WALL_THICKNESS / 2 + 1.5,
        minZ: BUILDING_DEPTH / 2 - 5 - WALL_THICKNESS / 2,
        maxZ: BUILDING_DEPTH / 2 - 5 + WALL_THICKNESS / 2,
        minY: yBase,
        maxY: yBase + 8,
        type: 'door',
        isOpening: true
      });
    }

    const windowYs = [
      { min: yBase + 12.5, max: yBase + 17.5 }
    ];

    if (floor === 0) {
      windowYs.forEach(wy => {
        wallRects.push({
          minX: -14, maxX: -10,
          minZ: BUILDING_DEPTH / 2 - WALL_THICKNESS / 2, maxZ: BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
        wallRects.push({
          minX: 10, maxX: 14,
          minZ: BUILDING_DEPTH / 2 - WALL_THICKNESS / 2, maxZ: BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
        wallRects.push({
          minX: -2, maxX: 2,
          minZ: -BUILDING_DEPTH / 2 - WALL_THICKNESS / 2, maxZ: -BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
        wallRects.push({
          minX: BUILDING_WIDTH / 2 - WALL_THICKNESS / 2, maxX: BUILDING_WIDTH / 2 + WALL_THICKNESS / 2,
          minZ: -2, maxZ: 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
      });
    }

    if (floor === 1) {
      windowYs.forEach(wy => {
        wallRects.push({
          minX: -14, maxX: -10,
          minZ: BUILDING_DEPTH / 2 - WALL_THICKNESS / 2, maxZ: BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
        wallRects.push({
          minX: 10, maxX: 14,
          minZ: BUILDING_DEPTH / 2 - WALL_THICKNESS / 2, maxZ: BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
        wallRects.push({
          minX: -2, maxX: 2,
          minZ: -BUILDING_DEPTH / 2 - WALL_THICKNESS / 2, maxZ: -BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
        wallRects.push({
          minX: -BUILDING_WIDTH / 2 - WALL_THICKNESS / 2, maxX: -BUILDING_WIDTH / 2 + WALL_THICKNESS / 2,
          minZ: -2, maxZ: 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
      });
    }

    if (floor === 2) {
      windowYs.forEach(wy => {
        wallRects.push({
          minX: -14, maxX: -10,
          minZ: BUILDING_DEPTH / 2 - WALL_THICKNESS / 2, maxZ: BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
        wallRects.push({
          minX: 10, maxX: 14,
          minZ: BUILDING_DEPTH / 2 - WALL_THICKNESS / 2, maxZ: BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
        wallRects.push({
          minX: -2, maxX: 2,
          minZ: -BUILDING_DEPTH / 2 - WALL_THICKNESS / 2, maxZ: -BUILDING_DEPTH / 2 + WALL_THICKNESS / 2,
          minY: wy.min, maxY: wy.max, type: 'window', isOpening: true
        });
      });
    }

    const stairWidth = 6;
    const stepHeight = FLOOR_HEIGHT / 15;
    const stepDepth = 1.2;
    for (let step = 0; step < 15; step++) {
      wallRects.push({
        minX: BUILDING_WIDTH / 2 - stairWidth - 3,
        maxX: BUILDING_WIDTH / 2 - 3,
        minZ: -BUILDING_DEPTH / 2 + step * stepDepth + 2 - stepDepth / 2,
        maxZ: -BUILDING_DEPTH / 2 + step * stepDepth + 2 + stepDepth / 2,
        minY: yBase + step * stepHeight,
        maxY: yBase + (step + 1) * stepHeight,
        type: 'stair'
      });
    }

    wallRects.push({
      minX: -BUILDING_WIDTH / 2,
      maxX: BUILDING_WIDTH / 2,
      minZ: -BUILDING_DEPTH / 2,
      maxZ: BUILDING_DEPTH / 2,
      minY: (floor + 1) * FLOOR_HEIGHT - 0.25,
      maxY: (floor + 1) * FLOOR_HEIGHT + 0.25,
      type: 'floor'
    });
  }
}

function computeSection(cutHeight: number): SectionData {
  const polygons: ContourPolygon[] = [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

  wallRects.forEach(rect => {
    if (cutHeight >= rect.minY && cutHeight <= rect.maxY) {
      const points = [
        { x: rect.minX, y: rect.minZ },
        { x: rect.maxX, y: rect.minZ },
        { x: rect.maxX, y: rect.maxZ },
        { x: rect.minX, y: rect.maxZ }
      ];

      polygons.push({
        points,
        type: rect.type,
        isOpening: rect.isOpening
      });

      minX = Math.min(minX, rect.minX);
      maxX = Math.max(maxX, rect.maxX);
      minZ = Math.min(minZ, rect.minZ);
      maxZ = Math.max(maxZ, rect.maxZ);
    }
  });

  if (!isFinite(minX)) {
    minX = -BUILDING_WIDTH / 2 - 2;
    maxX = BUILDING_WIDTH / 2 + 2;
    minZ = -BUILDING_DEPTH / 2 - 2;
    maxZ = BUILDING_DEPTH / 2 + 2;
  }

  return {
    polygons,
    bounds: { minX, maxX, minY: minZ, maxY: maxZ },
    cutHeight
  };
}

function init() {
  initWallRects();

  eventBus.on('cutHeightChanged', (height: number) => {
    const startTime = performance.now();
    const sectionData = computeSection(height);
    const elapsed = performance.now() - startTime;
    if (elapsed > 100) {
      console.warn(`剖面计算耗时 ${elapsed.toFixed(1)}ms，超过预期`);
    }
    eventBus.emit('sectionDataUpdated', sectionData);
  });

  const slider = document.getElementById('cut-slider') as HTMLInputElement;
  if (slider) {
    const initialHeight = (parseInt(slider.value) / 100) * TOTAL_HEIGHT;
    const initialData = computeSection(initialHeight);
    eventBus.emit('sectionDataUpdated', initialData);
  }
}

init();

export { computeSection, type SectionData, type ContourPolygon };
