import type { Symbol, SymbolColor, PhysicsParams, CanvasState } from './types';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpColor = (color1: SymbolColor, color2: SymbolColor, t: number): SymbolColor => ({
  r: Math.round(lerp(color1.r, color2.r, t)),
  g: Math.round(lerp(color1.g, color2.g, t)),
  b: Math.round(lerp(color1.b, color2.b, t)),
});

const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

const blendColors = (colors: SymbolColor[]): SymbolColor => {
  if (colors.length === 0) return { r: 255, g: 255, b: 255 };
  if (colors.length === 1) return colors[0];
  const total = colors.reduce(
    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
    { r: 0, g: 0, b: 0 }
  );
  const len = colors.length;
  return {
    r: Math.round(total.r / len),
    g: Math.round(total.g / len),
    b: Math.round(total.b / len),
  };
};

export const updateSymbols = (
  symbols: Symbol[],
  params: PhysicsParams,
  canvas: CanvasState
): Symbol[] => {
  const { gravity, elasticity, blendThreshold } = params;
  const { width, height } = canvas;

  const updated: Symbol[] = symbols.map((s) => ({ ...s, color: { ...s.color } }));

  for (const s of updated) {
    s.vy += gravity;
    s.x += s.vx;
    s.y += s.vy;

    if (s.x <= 0) {
      s.x = 0;
      s.vx = -s.vx * elasticity;
    }
    if (s.x >= width) {
      s.x = width;
      s.vx = -s.vx * elasticity;
    }
    if (s.y <= 0) {
      s.y = 0;
      s.vy = -s.vy * elasticity;
    }
    if (s.y >= height) {
      s.y = height;
      s.vy = -s.vy * elasticity;
      if (Math.abs(s.vy) < 0.5) {
        s.vy = 0;
      }
    }
  }

  const blendTargets: Map<number, SymbolColor[]> = new Map();
  for (let i = 0; i < updated.length; i++) {
    blendTargets.set(i, [updated[i].baseColor]);
  }

  for (let i = 0; i < updated.length; i++) {
    for (let j = i + 1; j < updated.length; j++) {
      const d = distance(updated[i].x, updated[i].y, updated[j].x, updated[j].y);
      if (d < blendThreshold) {
        blendTargets.get(i)!.push(updated[j].baseColor);
        blendTargets.get(j)!.push(updated[i].baseColor);
      }
    }
  }

  const blendT = 0.05;
  for (let i = 0; i < updated.length; i++) {
    const targetColors = blendTargets.get(i)!;
    const targetColor = blendColors(targetColors);
    updated[i].color = lerpColor(updated[i].color, targetColor, blendT);
  }

  return updated;
};
