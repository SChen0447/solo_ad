export const SKIN_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#9b59b6',
  '#f39c12', '#1abc9c', '#e91e63', '#00bcd4'
];

export const SKIN_NAMES = [
  '烈焰红', '深海蓝', '森林绿', '神秘紫',
  '黄金橙', '碧玉石', '樱粉红', '冰寒青'
];

export const PERSONALITIES = [
  { name: '勇猛', desc: '攻击性强，力量出众' },
  { name: '温顺', desc: '平易近人，情感丰富' },
  { name: '聪明', desc: '智慧超群，善于思考' },
  { name: '机敏', desc: '反应灵敏，动作敏捷' },
  { name: '沉稳', desc: '意志坚定，耐力惊人' },
  { name: '高傲', desc: '天生傲骨，自信非凡' }
];

export interface Dragon {
  skinColor: string;
  skinName: string;
  skinIndex: number;
  personalityIndex: number;
  personalityName: string;
  personalityDesc: string;
  strength: number;
  agility: number;
  intelligence: number;
  growth: number;
  maxGrowth: number;
  scale: number;
  hasWings: boolean;
  isFlying: boolean;
}

export interface FoodItem {
  x: number;
  y: number;
  type: 'bug' | 'fruit';
  born: number;
}

export function generateDragon(): Dragon {
  const skinIndex = Math.floor(Math.random() * SKIN_COLORS.length);
  const personalityIndex = Math.floor(Math.random() * PERSONALITIES.length);
  return {
    skinColor: SKIN_COLORS[skinIndex],
    skinName: SKIN_NAMES[skinIndex],
    skinIndex,
    personalityIndex,
    personalityName: PERSONALITIES[personalityIndex].name,
    personalityDesc: PERSONALITIES[personalityIndex].desc,
    strength: 10 + Math.floor(Math.random() * 21),
    agility: 10 + Math.floor(Math.random() * 21),
    intelligence: 10 + Math.floor(Math.random() * 21),
    growth: 0,
    maxGrowth: 30,
    scale: 1,
    hasWings: false,
    isFlying: false
  };
}

export function feedDragon(dragon: Dragon, food: FoodItem): { grown: boolean; evolved: boolean } {
  const prevGrowth = dragon.growth;
  dragon.growth = Math.min(dragon.maxGrowth, dragon.growth + 0.5);
  const grown = dragon.growth > prevGrowth;
  let evolved = false;
  if (dragon.growth >= dragon.maxGrowth && !dragon.hasWings) {
    dragon.hasWings = true;
    dragon.scale += 0.2;
    evolved = true;
  }
  return { grown, evolved };
}

const PIXEL_SIZE = 8;

export function drawDragon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dragon: Dragon,
  time: number
): void {
  const s = PIXEL_SIZE * dragon.scale;
  let offsetY = 0;
  if (dragon.isFlying) {
    offsetY = Math.sin(time * Math.PI * 4) * 8 * dragon.scale;
  }

  ctx.save();
  ctx.translate(cx, cy + offsetY);

  const darker = shadeColor(dragon.skinColor, -35);
  const lighter = shadeColor(dragon.skinColor, 25);

  // 身体（16x16像素图映射）
  // 使用字符映射：
  //   0 = 透明
  //   B = 主色
  //   D = 深色阴影
  //   L = 浅色高光
  //   E = 眼睛白
  //   P = 瞳孔
  //   H = 角/刺
  //   W = 翅膀
  //   M = 嘴部
  const pattern = [
    '00000HHH00000000',
    '0000HHHHH0000000',
    '000HHLLLLHH00000',
    '000HLLLLLLH00000',
    '000HLELPELH00000',
    '000HLELPELH00000',
    '000HLLLLLLH00000',
    '000HLLMLLLH00000',
    '00HHLLLLLLHH0000',
    '0HBBHLLLLHBBH000',
    '0HBBBBLLLBBBBH000',
    '0HBBBBBBBBBBBH00',
    '0HDBBDBBBDBBBH00',
    '000HDDDBBBDDH0000',
    '0000HHDDHH000000',
    '000000HH00000000'
  ];

  const totalW = pattern[0].length;
  const totalH = pattern.length;
  const startX = -((totalW * s) / 2);
  const startY = -((totalH * s) / 2);

  for (let y = 0; y < totalH; y++) {
    const row = pattern[y];
    for (let x = 0; x < totalW; x++) {
      const c = row[x];
      if (c === '0') continue;
      let color = dragon.skinColor;
      switch (c) {
        case 'B': color = dragon.skinColor; break;
        case 'D': color = darker; break;
        case 'L': color = lighter; break;
        case 'E': color = '#ffffff'; break;
        case 'P': color = '#1a1a2e'; break;
        case 'H': color = '#2c3e50'; break;
        case 'M': color = shadeColor(dragon.skinColor, -20); break;
      }
      drawPixel(ctx, startX + x * s, startY + y * s, s, color);
    }
  }

  if (dragon.hasWings) {
    drawWings(ctx, 0, 0, s, dragon.skinColor, time, dragon.isFlying);
  }

  ctx.restore();
}

function drawWings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  color: string,
  time: number,
  flying: boolean
): void {
  const wingScale = flying ? 0.9 + Math.sin(time * Math.PI * 8) * 0.1 : 1;
  ctx.save();

  const wingColor = shadeColor(color, 18);
  const wingColorDark = shadeColor(color, -10);

  ctx.translate(-7 * s, -2 * s);
  const wingPatternLeft = [
    '0000WWW0',
    '000WWWW',
    '00WWWWW',
    '0WWWWWW',
    '00WWWWW',
    '0000WWW',
  ];
  for (let y = 0; y < wingPatternLeft.length; y++) {
    for (let x = 0; x < wingPatternLeft[y].length; x++) {
      const ch = wingPatternLeft[y][x];
      if (ch === 'W') {
        const fy = y * (wingScale);
        drawPixel(ctx, x * s, fy * s, s, wingColor);
      }
    }
  }
  ctx.translate(14 * s, 0);
  const wingPatternRight = [
    '0WWW0000',
    'WWWW000',
    'WWWWW00',
    'WWWWWW0',
    'WWWWW00',
    'WWW0000',
  ];
  for (let y = 0; y < wingPatternRight.length; y++) {
    for (let x = 0; x < wingPatternRight[y].length; x++) {
      const ch = wingPatternRight[y][x];
      if (ch === 'W') {
        const fy = y * (wingScale);
        drawPixel(ctx, x * s, fy * s, s, wingColorDark);
      }
    }
  }
  ctx.restore();
}

function drawPixel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(s), Math.ceil(s));
}

export function drawDragonSilhouette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dragon: Dragon
): void {
  const cx = width / 2;
  const cy = height / 2 + 10;
  const scale = 10;
  const darker = shadeColor(dragon.skinColor, -40);
  const lighter = shadeColor(dragon.skinColor, 30);
  const pattern = [
    '0000000000000000',
    '00000SSSS0000000',
    '0000SSSSSS000000',
    '000SSSSSSSS00000',
    '000SSWWSSWSS00000',
    '000SSWWSSWSS00000',
    '000SSSSSSSS00000',
    '000SSSSSSSS00000',
    '00SSSSSSSSSS0000',
    '0SSSSSSSSSSSS000',
    '0SSSSSSSSSSSS000',
    '0SSDDSSSSSSDDSS00',
    '00SSDDDDDDSSS000',
    '0000SSSSSS000000',
    '000000SS00000000',
    '0000000000000000'
  ];

  const totalW = pattern[0].length;
  const totalH = pattern.length;
  const startX = cx - (totalW * scale) / 2;
  const startY = cy - (totalH * scale) / 2;

  for (let y = 0; y < totalH; y++) {
    for (let x = 0; x < totalW; x++) {
      const c = pattern[y][x];
      if (c === '0') continue;
      let color = dragon.skinColor;
      if (c === 'D') color = darker;
      else if (c === 'W') color = lighter;
      ctx.fillStyle = color;
      ctx.fillRect(startX + x * scale, startY + y * scale, scale + 0.5, scale + 0.5);
    }
  }

  // 眼睛高光
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(startX + 5 * scale, startY + 4 * scale, scale * 0.7, scale * 0.7);
  ctx.fillRect(startX + 8 * scale, startY + 4 * scale, scale * 0.7, scale * 0.7);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(startX + 5.3 * scale, startY + 4.3 * scale, scale * 0.5, scale * 0.5);
  ctx.fillRect(startX + 8.3 * scale, startY + 4.3 * scale, scale * 0.5, scale * 0.5);
}

function shadeColor(hex: string, percent: number): string {
  const f = parseInt(hex.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  const R = f >> 16;
  const G = (f >> 8) & 0x00ff;
  const B = f & 0x0000ff;
  const r = Math.round((t - R) * p + R);
  const g = Math.round((t - G) * p + G);
  const b = Math.round((t - B) * p + B);
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

export function spawnFood(canvasW: number, canvasH: number, margin: number = 40): FoodItem {
  const isBug = Math.random() < 0.5;
  const type: 'bug' | 'fruit' = isBug ? 'bug' : 'fruit';
  return {
    x: margin + Math.random() * (canvasW - margin * 2),
    y: margin + 20 + Math.random() * (canvasH - margin * 2 - 40),
    type,
    born: performance.now()
  };
}

export function drawFood(ctx: CanvasRenderingContext2D, food: FoodItem, time: number): void {
  ctx.save();
  const bob = Math.sin((time + food.born * 0.001) * 2);
  if (food.type === 'bug') {
    ctx.fillStyle = '#e74c3c';
    ctx.shadowColor = '#e74c3c';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(food.x, food.y + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    // 触须
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(food.x - 1, food.y - 3 + bob);
    ctx.lineTo(food.x - 3, food.y - 7 + bob);
    ctx.moveTo(food.x + 1, food.y - 3 + bob);
    ctx.lineTo(food.x + 3, food.y - 7 + bob);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#2ecc71';
    ctx.shadowColor = '#2ecc71';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(food.x, food.y + bob, 4, 0, Math.PI * 2);
    ctx.fill();
    // 叶子
    ctx.fillStyle = '#27ae60';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(food.x + 2, food.y - 5 + bob, 2, 1, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
