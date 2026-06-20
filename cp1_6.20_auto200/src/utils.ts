import { Card, RARITY_CONFIG, Rarity, SIZES } from './types';

export const generateId = (): string => {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createDefaultCard = (): Card => ({
  id: generateId(),
  name: '新卡牌',
  hp: 100,
  attack: 10,
  skill: '',
  rarity: 'common',
  currentHp: 100
});

export const saveCardsToStorage = (cards: Card[]): void => {
  try {
    localStorage.setItem('card_deck', JSON.stringify(cards));
  } catch (e) {
    console.error('Failed to save cards:', e);
  }
};

export const loadCardsFromStorage = (): Card[] => {
  try {
    const data = localStorage.getItem('card_deck');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load cards:', e);
    return [];
  }
};

export const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

export const renderCardToCanvas = (
  canvas: HTMLCanvasElement,
  card: Card,
  width: number = SIZES.cardWidth,
  height: number = SIZES.cardHeight
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = width;
  canvas.height = height;

  const rarity = RARITY_CONFIG[card.rarity];

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, rarity.gradient.start);
  gradient.addColorStop(1, rarity.gradient.end);

  drawRoundedRect(ctx, 0, 0, width, height, SIZES.cardRadius);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const padding = 20;
  const scale = width / SIZES.cardWidth;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${20 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(card.name, width / 2, padding + 25 * scale);

  const badgeY = padding + 50 * scale;
  const badgeWidth = 70 * scale;
  const badgeHeight = 26 * scale;
  const badgeX = width / 2 - badgeWidth / 2;

  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 13 * scale);
  const badgeGradient = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeHeight);
  badgeGradient.addColorStop(0, rarity.color);
  badgeGradient.addColorStop(1, shadeColor(rarity.color, -20));
  ctx.fillStyle = badgeGradient;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${12 * scale}px sans-serif`;
  ctx.fillText(rarity.label, width / 2, badgeY + 17 * scale);

  const statsY = badgeY + badgeHeight + 30 * scale;
  const statSize = 50 * scale;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  drawRoundedRect(ctx, padding, statsY, statSize, statSize, 8 * scale);
  ctx.fill();
  drawRoundedRect(ctx, width - padding - statSize, statsY, statSize, statSize, 8 * scale);
  ctx.fill();

  ctx.fillStyle = '#FF6B6B';
  ctx.font = `bold ${22 * scale}px sans-serif`;
  ctx.fillText('❤', padding + statSize / 2, statsY + 20 * scale);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${14 * scale}px sans-serif`;
  ctx.fillText(String(card.currentHp ?? card.hp), padding + statSize / 2, statsY + 40 * scale);

  ctx.fillStyle = '#FFD93D';
  ctx.font = `bold ${22 * scale}px sans-serif`;
  ctx.fillText('⚔', width - padding - statSize / 2, statsY + 20 * scale);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${14 * scale}px sans-serif`;
  ctx.fillText(String(card.attack), width - padding - statSize / 2, statsY + 40 * scale);

  const skillY = statsY + statSize + 25 * scale;
  const skillHeight = height - skillY - padding;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  drawRoundedRect(ctx, padding, skillY, width - padding * 2, skillHeight, 8 * scale);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${12 * scale}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 2;

  const lines = wrapText(ctx, card.skill || '暂无技能描述', width - padding * 2 - 20 * scale);
  lines.slice(0, 5).forEach((line, i) => {
    ctx.fillText(line, padding + 10 * scale, skillY + 25 * scale + i * 18 * scale);
  });

  ctx.shadowBlur = 0;
};

const shadeColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255))
      .toString(16)
      .slice(1)
  );
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

export const generateThumbnail = (card: Card): string => {
  const canvas = document.createElement('canvas');
  renderCardToCanvas(canvas, card, SIZES.thumbnailWidth, SIZES.thumbnailHeight);
  return canvas.toDataURL('image/png');
};
