export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const normalize = (value: number, min: number, max: number): number => {
  if (max - min === 0) return 0;
  return (value - min) / (max - min);
};

export const denormalize = (t: number, min: number, max: number): number => {
  return min + t * (max - min);
};

export const lerpColor = (color1: RGBColor, color2: RGBColor, t: number): RGBColor => {
  const clampedT = clamp(t, 0, 1);
  return {
    r: Math.round(lerp(color1.r, color2.r, clampedT)),
    g: Math.round(lerp(color1.g, color2.g, clampedT)),
    b: Math.round(lerp(color1.b, color2.b, clampedT))
  };
};

export const rgbToString = (color: RGBColor): string => {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
};

export const rgbToHex = (color: RGBColor): number => {
  return (color.r << 16) | (color.g << 8) | color.b;
};

export const hexToRgb = (hex: number): RGBColor => {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255
  };
};

export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

export const easeOutQuad = (t: number): number => {
  return 1 - (1 - t) * (1 - t);
};

export const easeInQuad = (t: number): number => {
  return t * t;
};

export const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const randomInt = (min: number, max: number): number => {
  return Math.floor(randomRange(min, max + 1));
};

export const snapToInt = (value: number): number => {
  return Math.round(value);
};

export const smoothDamp = (
  current: number,
  target: number,
  currentVelocity: number,
  smoothTime: number,
  deltaTime: number,
  maxSpeed: number = Infinity
): { value: number; velocity: number } => {
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target;
  const originalTo = target;
  const maxChange = maxSpeed * smoothTime;
  change = clamp(change, -maxChange, maxChange);
  target = current - change;
  const temp = (currentVelocity + omega * change) * deltaTime;
  let velocity = (currentVelocity - omega * temp) * exp;
  let output = target + (change + temp) * exp;
  if (originalTo - current > 0.0 === output > originalTo) {
    output = originalTo;
    velocity = (output - originalTo) / deltaTime;
  }
  return { value: output, velocity };
};

export const formatDateTime = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};
