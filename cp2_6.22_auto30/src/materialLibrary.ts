export type MaterialCategory = 'floor' | 'wall' | 'curtain';

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  baseColor: string;
  secondaryColor?: string;
  pattern?: PatternType;
}

export type PatternType =
  | 'wood-grain'
  | 'tile-grid'
  | 'brick'
  | 'stripes'
  | 'dots'
  | 'marble'
  | 'damask'
  | 'velvet'
  | 'plain';

export interface MaterialSelection {
  floor: string;
  wall: string;
  curtain: string;
}

const floors: Material[] = [
  {
    id: 'floor-oak',
    name: '橡木',
    category: 'floor',
    baseColor: '#C69C6D',
    secondaryColor: '#A67C52',
    pattern: 'wood-grain',
  },
  {
    id: 'floor-walnut',
    name: '胡桃木',
    category: 'floor',
    baseColor: '#6B4423',
    secondaryColor: '#4A2F17',
    pattern: 'wood-grain',
  },
  {
    id: 'floor-marble-light',
    name: '浅色大理石',
    category: 'floor',
    baseColor: '#E8E4DC',
    secondaryColor: '#C8C0B4',
    pattern: 'marble',
  },
  {
    id: 'floor-tile-gray',
    name: '灰色瓷砖',
    category: 'floor',
    baseColor: '#9CA3AF',
    secondaryColor: '#6B7280',
    pattern: 'tile-grid',
  },
  {
    id: 'floor-bamboo',
    name: '竹地板',
    category: 'floor',
    baseColor: '#D4A574',
    secondaryColor: '#B8865A',
    pattern: 'wood-grain',
  },
  {
    id: 'floor-cherry',
    name: '樱桃木',
    category: 'floor',
    baseColor: '#8B3A3A',
    secondaryColor: '#6B2A2A',
    pattern: 'wood-grain',
  },
];

const walls: Material[] = [
  {
    id: 'wall-cream',
    name: '米白色',
    category: 'wall',
    baseColor: '#FAF7F0',
    pattern: 'plain',
  },
  {
    id: 'wall-gray-warm',
    name: '暖灰色',
    category: 'wall',
    baseColor: '#D6D0C8',
    pattern: 'plain',
  },
  {
    id: 'wall-pink-soft',
    name: '柔粉色',
    category: 'wall',
    baseColor: '#F5D5D0',
    pattern: 'plain',
  },
  {
    id: 'wall-green-sage',
    name: '鼠尾草绿',
    category: 'wall',
    baseColor: '#B8C9B0',
    pattern: 'plain',
  },
  {
    id: 'wall-brick-red',
    name: '红砖纹理',
    category: 'wall',
    baseColor: '#A0522D',
    secondaryColor: '#8B4513',
    pattern: 'brick',
  },
  {
    id: 'wall-blue-dust',
    name: '雾霾蓝',
    category: 'wall',
    baseColor: '#A8B8C8',
    pattern: 'plain',
  },
];

const curtains: Material[] = [
  {
    id: 'curtain-white-sheer',
    name: '白色纱帘',
    category: 'curtain',
    baseColor: '#FAFAF5',
    secondaryColor: '#E8E8DF',
    pattern: 'stripes',
  },
  {
    id: 'curtain-blue-navy',
    name: '藏青色',
    category: 'curtain',
    baseColor: '#2C3E50',
    secondaryColor: '#1A252F',
    pattern: 'velvet',
  },
  {
    id: 'curtain-beige',
    name: '米色亚麻',
    category: 'curtain',
    baseColor: '#D9C9A8',
    secondaryColor: '#C4B088',
    pattern: 'stripes',
  },
  {
    id: 'curtain-green-emerald',
    name: '祖母绿',
    category: 'curtain',
    baseColor: '#2E8B57',
    secondaryColor: '#1E6B47',
    pattern: 'damask',
  },
  {
    id: 'curtain-pink-rose',
    name: '玫瑰粉',
    category: 'curtain',
    baseColor: '#E8B4B8',
    secondaryColor: '#D8989C',
    pattern: 'dots',
  },
  {
    id: 'curtain-gray-charcoal',
    name: '深灰色',
    category: 'curtain',
    baseColor: '#5A5A5A',
    secondaryColor: '#3A3A3A',
    pattern: 'velvet',
  },
];

export const materialsByCategory: Record<MaterialCategory, Material[]> = {
  floor: floors,
  wall: walls,
  curtain: curtains,
};

export function getMaterials(category: MaterialCategory): Material[] {
  return materialsByCategory[category];
}

export function getMaterialById(category: MaterialCategory, id: string): Material | undefined {
  return materialsByCategory[category].find((m) => m.id === id);
}

export function getDefaultSelection(): MaterialSelection {
  return {
    floor: floors[0].id,
    wall: walls[0].id,
    curtain: curtains[0].id,
  };
}

export function drawMaterialThumbnail(
  ctx: CanvasRenderingContext2D,
  material: Material,
  width: number,
  height: number
): void {
  const pattern = material.pattern || 'plain';

  ctx.fillStyle = material.baseColor;
  ctx.fillRect(0, 0, width, height);

  switch (pattern) {
    case 'wood-grain':
      drawWoodGrain(ctx, material, width, height);
      break;
    case 'tile-grid':
      drawTileGrid(ctx, material, width, height);
      break;
    case 'brick':
      drawBrickPattern(ctx, material, width, height);
      break;
    case 'stripes':
      drawStripes(ctx, material, width, height);
      break;
    case 'dots':
      drawDots(ctx, material, width, height);
      break;
    case 'marble':
      drawMarble(ctx, material, width, height);
      break;
    case 'damask':
      drawDamask(ctx, material, width, height);
      break;
    case 'velvet':
      drawVelvet(ctx, material, width, height);
      break;
    case 'plain':
    default:
      break;
  }
}

function drawWoodGrain(
  ctx: CanvasRenderingContext2D,
  material: Material,
  w: number,
  h: number
): void {
  const secondary = material.secondaryColor || adjustColor(material.baseColor, -30);
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.5;

  for (let y = 0; y < h; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.random() * 3);
    for (let x = 0; x < w; x += 4) {
      ctx.lineTo(x, y + Math.sin(x * 0.08 + y * 0.1) * 2);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = adjustColor(secondary, -20);
  for (let i = 0; i < 3; i++) {
    const ky = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(0, ky);
    for (let x = 0; x < w; x += 3) {
      ctx.lineTo(x, ky + Math.sin(x * 0.1 + i) * 4);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawTileGrid(
  ctx: CanvasRenderingContext2D,
  material: Material,
  w: number,
  h: number
): void {
  const tileSize = 20;
  const groutColor = material.secondaryColor || adjustColor(material.baseColor, -40);
  const highlight = adjustColor(material.baseColor, 15);

  ctx.strokeStyle = groutColor;
  ctx.lineWidth = 1.5;

  for (let y = 0; y <= h; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = 0; x <= w; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.3;
  for (let y = 0; y < h; y += tileSize) {
    for (let x = 0; x < w; x += tileSize) {
      if ((x / tileSize + y / tileSize) % 2 === 0) {
        ctx.fillStyle = highlight;
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize / 3);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawBrickPattern(
  ctx: CanvasRenderingContext2D,
  material: Material,
  w: number,
  h: number
): void {
  const brickW = 24;
  const brickH = 10;
  const mortar = '#3A2517';
  const secondary = material.secondaryColor || adjustColor(material.baseColor, -20);

  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, w, h);

  let row = 0;
  for (let y = 0; y < h; y += brickH) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let x = -brickW; x < w + brickW; x += brickW) {
      const px = x + offset;
      ctx.fillStyle = Math.random() > 0.5 ? material.baseColor : secondary;
      ctx.fillRect(px + 1, y + 1, brickW - 2, brickH - 2);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = adjustColor(material.baseColor, 10);
      ctx.fillRect(px + 1, y + 1, brickW - 2, 2);
      ctx.globalAlpha = 1;
    }
    row++;
  }
}

function drawStripes(
  ctx: CanvasRenderingContext2D,
  material: Material,
  w: number,
  h: number
): void {
  const secondary = material.secondaryColor || adjustColor(material.baseColor, -15);
  ctx.fillStyle = secondary;
  ctx.globalAlpha = 0.35;

  for (let x = 0; x < w; x += 6) {
    ctx.fillRect(x, 0, 2, h);
  }

  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#FFFFFF';
  for (let y = 0; y < h; y += 12) {
    ctx.fillRect(0, y, w, 1);
  }

  ctx.globalAlpha = 1;
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  material: Material,
  w: number,
  h: number
): void {
  const secondary = material.secondaryColor || adjustColor(material.baseColor, -30);
  ctx.fillStyle = secondary;
  ctx.globalAlpha = 0.5;

  for (let y = 6; y < h; y += 10) {
    for (let x = 6; x < w; x += 10) {
      const offset = (y / 10) % 2 === 0 ? 0 : 5;
      ctx.beginPath();
      ctx.arc(x + offset, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

function drawMarble(
  ctx: CanvasRenderingContext2D,
  material: Material,
  w: number,
  h: number
): void {
  const secondary = material.secondaryColor || adjustColor(material.baseColor, -20);
  ctx.strokeStyle = secondary;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 0.8;

  let y = 0;
  while (y < h) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    let cx = 0;
    let cy = y;
    while (cx < w) {
      const nx = cx + 15 + Math.random() * 25;
      const ny = cy + (Math.random() - 0.5) * 20;
      ctx.bezierCurveTo(cx + 10, cy - 8, nx - 5, ny + 8, nx, ny);
      cx = nx;
      cy = ny;
    }
    ctx.stroke();
    y += 8 + Math.random() * 8;
  }

  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#FFFFFF';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const startY = Math.random() * h;
    ctx.moveTo(0, startY);
    let cx = 0;
    let cy = startY;
    while (cx < w) {
      const nx = cx + 20 + Math.random() * 30;
      const ny = cy + (Math.random() - 0.5) * 15;
      ctx.quadraticCurveTo((cx + nx) / 2, cy + (Math.random() - 0.5) * 10, nx, ny);
      cx = nx;
      cy = ny;
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawDamask(
  ctx: CanvasRenderingContext2D,
  material: Material,
  w: number,
  h: number
): void {
  const secondary = material.secondaryColor || adjustColor(material.baseColor, -25);
  ctx.fillStyle = secondary;
  ctx.globalAlpha = 0.35;

  for (let gy = 0; gy < h; gy += 16) {
    for (let gx = 0; gx < w; gx += 16) {
      const offset = (gy / 16) % 2 === 0 ? 0 : 8;
      const cx = gx + offset + 8;
      const cy = gy + 8;

      ctx.beginPath();
      ctx.ellipse(cx, cy - 3, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy + 3, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy + 5);
      ctx.lineTo(cx, cy + 8);
      ctx.lineWidth = 1;
      ctx.strokeStyle = secondary;
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
}

function drawVelvet(
  ctx: CanvasRenderingContext2D,
  material: Material,
  w: number,
  h: number
): void {
  const secondary = material.secondaryColor || adjustColor(material.baseColor, -20);
  const highlight = adjustColor(material.baseColor, 20);

  ctx.globalAlpha = 0.4;
  ctx.fillStyle = secondary;
  for (let y = 0; y < h; y += 3) {
    if (y % 6 === 0) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = highlight;
  for (let y = 0; y < h; y += 9) {
    ctx.fillRect(0, y, w, 1.5);
  }

  ctx.globalAlpha = 0.6;
  ctx.fillStyle = secondary;
  for (let x = 0; x < w; x += 50) {
    ctx.fillRect(x + Math.random() * 10, 0, 2, h);
  }

  ctx.globalAlpha = 1;
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
