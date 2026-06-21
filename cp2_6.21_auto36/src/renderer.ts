import { TypesetResult, TextLine } from './typesetter';

export interface RenderOptions {
  scale: number;
  offsetX: number;
  offsetY: number;
  showGuides: boolean;
  showRuler: boolean;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  contrastMode: boolean;
  contrastFontFamily: string;
  text: string;
  letterSpacing: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
}

const GRID_SPACING = 50;
const GRID_LINE_WIDTH = 0.3;
const GRID_COLOR = '#E0E0E0';
const GUIDE_LINE_WIDTH = 0.5;
const GUIDE_COLOR = '#CCC';
const RULER_WIDTH = 20;
const RULER_FONT_SIZE = 10;
const RULER_COLOR = '#999';

export function render(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  result: TypesetResult,
  options: RenderOptions
): void {
  const { scale, offsetX, offsetY } = options;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(offsetX, offsetY);

  drawGrid(ctx, canvasWidth / scale, canvasHeight / scale);

  if (options.showRuler) {
    drawRuler(ctx, canvasHeight / scale, options);
  }

  const textAreaX = options.showRuler ? RULER_WIDTH : 0;
  const textAreaWidth = canvasWidth / scale - textAreaX;

  drawTextLines(ctx, result, textAreaX, options);

  if (options.contrastMode) {
    drawContrastDivider(ctx, textAreaX, textAreaWidth, canvasHeight / scale);
  }

  if (options.showGuides) {
    drawGuideLines(ctx, result, textAreaX, options);
  }

  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = GRID_LINE_WIDTH;
  ctx.beginPath();

  for (let x = 0; x <= width; x += GRID_SPACING) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }

  for (let y = 0; y <= height; y += GRID_SPACING) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }

  ctx.stroke();
}

function drawRuler(
  ctx: CanvasRenderingContext2D,
  height: number,
  options: RenderOptions
): void {
  const alpha = options.contrastMode ? 0.5 : 1.0;
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(0, 0, RULER_WIDTH, height);

  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(RULER_WIDTH, 0);
  ctx.lineTo(RULER_WIDTH, height);
  ctx.stroke();

  ctx.fillStyle = RULER_COLOR;
  ctx.font = `${RULER_FONT_SIZE}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let y = 0; y <= height; y += GRID_SPACING) {
    ctx.fillText(`${y}`, RULER_WIDTH - 3, y);

    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(RULER_WIDTH - 4, y);
    ctx.lineTo(RULER_WIDTH, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawTextLines(
  ctx: CanvasRenderingContext2D,
  result: TypesetResult,
  baseX: number,
  options: RenderOptions
): void {
  const { fontFamily, fontSize, letterSpacing, lineHeight } = options;

  ctx.save();
  ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = '#333333';
  ctx.textBaseline = 'alphabetic';

  for (const line of result.lines) {
    const y = line.baseline + 20;
    const text = reconstructLineText(line);
    if (text.length === 0) continue;

    if (options.contrastMode) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(baseX, y - fontSize, ctx.canvas.width / options.scale / 2 - baseX, fontSize * lineHeight);
      ctx.clip();
      ctx.fillText(text, baseX + 10, y);
      ctx.restore();

      ctx.save();
      ctx.font = `${fontSize}px "${options.contrastFontFamily}", sans-serif`;
      ctx.beginPath();
      ctx.rect(ctx.canvas.width / options.scale / 2, y - fontSize, ctx.canvas.width / options.scale / 2, fontSize * lineHeight);
      ctx.clip();
      ctx.fillText(text, ctx.canvas.width / options.scale / 2 + 10, y);
      ctx.restore();
    } else {
      if (letterSpacing !== 0) {
        drawTextWithSpacing(ctx, text, baseX + 10, y, letterSpacing, fontSize, fontFamily);
      } else {
        ctx.fillText(text, baseX + 10, y);
      }
    }
  }

  ctx.restore();
}

function drawTextWithSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  startX: number,
  y: number,
  spacing: number,
  fontSize: number,
  fontFamily: string
): void {
  ctx.save();
  ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
  ctx.textBaseline = 'alphabetic';
  let x = startX;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y);
    x += ctx.measureText(text[i]).width + spacing;
  }
  ctx.restore();
}

function reconstructLineText(line: TextLine): string {
  const chars: string[] = [];
  for (const gp of line.glyphs) {
    if (gp.glyph.unicode !== undefined) {
      chars.push(String.fromCharCode(gp.glyph.unicode));
    }
  }
  return chars.join('');
}

function drawGuideLines(
  ctx: CanvasRenderingContext2D,
  result: TypesetResult,
  baseX: number,
  options: RenderOptions
): void {
  const alpha = options.contrastMode ? 0.5 : 1.0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = GUIDE_LINE_WIDTH;
  ctx.setLineDash([]);

  const { fontSize, lineHeight } = options;
  const lineHeightPx = fontSize * lineHeight;
  const canvasWidth = ctx.canvas.width / options.scale;

  for (let i = 0; i < result.lines.length; i++) {
    const baselineY = i * lineHeightPx + lineHeightPx * 0.8 + 20;
    const bottomY = baselineY + fontSize * 0.2;

    ctx.beginPath();
    ctx.moveTo(baseX, bottomY);
    ctx.lineTo(canvasWidth, bottomY);
    ctx.stroke();
  }

  ctx.restore();
}

function drawContrastDivider(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  textAreaWidth: number,
  height: number
): void {
  const midX = baseX + textAreaWidth / 2;

  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  ctx.moveTo(midX, 0);
  ctx.lineTo(midX, height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function renderCard(
  ctx: CanvasRenderingContext2D,
  result: TypesetResult,
  options: RenderOptions,
  cardWidth: number,
  cardHeight: number,
  displayName?: string
): void {
  ctx.clearRect(0, 0, cardWidth, cardHeight);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cardWidth, cardHeight);

  const padding = 20;
  const textWidth = cardWidth - padding * 2;
  const { fontSize, lineHeight, fontFamily, letterSpacing } = options;
  const lineHeightPx = fontSize * lineHeight;

  ctx.save();
  ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = '#333333';
  ctx.textBaseline = 'alphabetic';

  let y = padding + fontSize;

  for (const line of result.lines) {
    const text = reconstructLineText(line);
    if (text.length === 0) {
      y += lineHeightPx;
      continue;
    }

    if (letterSpacing !== 0) {
      let x = padding;
      for (let i = 0; i < text.length; i++) {
        ctx.fillText(text[i], x, y);
        x += ctx.measureText(text[i]).width + letterSpacing;
      }
    } else {
      ctx.fillText(text, padding, y);
    }
    y += lineHeightPx;
  }

  ctx.font = '8px sans-serif';
  ctx.fillStyle = '#999999';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const dateStr = new Date().toLocaleDateString('zh-CN');
  ctx.fillText(
    `${displayName || fontFamily} | ${fontSize}px | ${dateStr}`,
    cardWidth - padding,
    cardHeight - padding
  );

  ctx.restore();
}
