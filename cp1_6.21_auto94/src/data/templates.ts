import type { Template, PixelGrid, PixelColor } from '../types';

function hexToRgb(hex: string): PixelColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255,
      }
    : { r: 0, g: 0, b: 0, a: 255 };
}

function createEmptyGrid(): PixelGrid {
  const grid: PixelGrid = [];
  for (let y = 0; y < 16; y++) {
    grid[y] = [];
    for (let x = 0; x < 16; x++) {
      grid[y][x] = null;
    }
  }
  return grid;
}

function createGrassTemplate(): PixelGrid {
  const grid = createEmptyGrid();
  const grassColors = [
    hexToRgb('#228b22'),
    hexToRgb('#32cd32'),
    hexToRgb('#2e8b57'),
    hexToRgb('#3cb371'),
    hexToRgb('#90ee90'),
  ];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) + Math.random() * 0.5;
      const colorIndex = Math.floor(Math.abs(noise) * grassColors.length) % grassColors.length;
      grid[y][x] = { ...grassColors[colorIndex] };
    }
  }

  for (let i = 0; i < 20; i++) {
    const x = Math.floor(Math.random() * 16);
    const y = Math.floor(Math.random() * 16);
    grid[y][x] = hexToRgb('#90ee90');
  }

  return grid;
}

function createStoneTemplate(): PixelGrid {
  const grid = createEmptyGrid();
  const stoneColors = [
    hexToRgb('#696969'),
    hexToRgb('#808080'),
    hexToRgb('#a9a9a9'),
    hexToRgb('#778899'),
    hexToRgb('#708090'),
  ];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const brickY = Math.floor(y / 4);
      const offset = brickY % 2 === 0 ? 0 : 8;
      const brickX = Math.floor((x + offset) / 8);
      
      const isMortar = y % 4 === 0 || (x + offset) % 8 === 0;
      
      if (isMortar) {
        grid[y][x] = hexToRgb('#2f2f2f');
      } else {
        const noise = (brickX * 3 + brickY * 7) % stoneColors.length;
        grid[y][x] = { ...stoneColors[noise] };
      }
    }
  }

  return grid;
}

function createWoodTemplate(): PixelGrid {
  const grid = createEmptyGrid();
  const woodColors = [
    hexToRgb('#8b4513'),
    hexToRgb('#a0522d'),
    hexToRgb('#cd853f'),
    hexToRgb('#d2691e'),
    hexToRgb('#deb887'),
  ];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const plankY = Math.floor(y / 4);
      const isGap = y % 4 === 0;
      
      if (isGap) {
        grid[y][x] = hexToRgb('#3d2817');
      } else {
        const baseNoise = Math.sin((x + plankY * 2) * 0.3) * 0.5 + 0.5;
        const grainNoise = Math.sin(y * 1.5 + x * 0.2) * 0.3;
        const colorIndex = Math.floor((baseNoise + grainNoise) * woodColors.length) % woodColors.length;
        grid[y][x] = { ...woodColors[Math.abs(colorIndex)] };
      }
    }
  }

  for (let y = 0; y < 16; y++) {
    if (y % 4 !== 0) {
      const knotX = Math.floor(Math.random() * 12) + 2;
      if (grid[y][knotX]) {
        grid[y][knotX] = hexToRgb('#3d2817');
        if (grid[y][knotX + 1]) grid[y][knotX + 1] = hexToRgb('#5d3a1a');
      }
    }
  }

  return grid;
}

export const TEMPLATES: Template[] = [
  {
    id: 'grass',
    name: '草地',
    grid: createGrassTemplate(),
    recommendedPalette: ['#228b22', '#32cd32', '#2e8b57', '#3cb371', '#90ee90', '#8b7355', '#6b4423', '#7f8c8d'],
  },
  {
    id: 'stone',
    name: '石砖',
    grid: createStoneTemplate(),
    recommendedPalette: ['#696969', '#808080', '#a9a9a9', '#778899', '#708090', '#2f2f2f', '#bdc3c7', '#ecf0f1'],
  },
  {
    id: 'wood',
    name: '木板',
    grid: createWoodTemplate(),
    recommendedPalette: ['#8b4513', '#a0522d', '#cd853f', '#d2691e', '#deb887', '#3d2817', '#6b4423', '#8b7355'],
  },
];

export const getTemplateById = (id: string): Template | undefined => {
  return TEMPLATES.find((t) => t.id === id);
};
