export const interpolateColor = (value: number, min: number, max: number): string => {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  const r1 = 34, g1 = 197, b1 = 94;
  const r2 = 239, g2 = 68, b2 = 68;
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
};

export const getHpColor = (currentHp: number, maxHp: number): string => {
  const ratio = currentHp / maxHp;
  return interpolateColor(ratio, 0, 1);
};

export const getGradientStyle = (type: 'character' | 'monster'): string => {
  if (type === 'character') {
    return 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)';
  }
  return 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)';
};
