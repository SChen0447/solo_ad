interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface KeywordInfo {
  hsl: HSL;
  emoji: string;
  label: string;
}

export const KEYWORDS: KeywordInfo[] = [
  { label: '活力', emoji: '🔥', hsl: { h: 15, s: 85, l: 55 } },
  { label: '宁静', emoji: '🌊', hsl: { h: 200, s: 60, l: 65 } },
  { label: '忧郁', emoji: '🌧', hsl: { h: 230, s: 40, l: 45 } },
  { label: '温暖', emoji: '☀️', hsl: { h: 40, s: 80, l: 60 } },
  { label: '神秘', emoji: '🌙', hsl: { h: 270, s: 50, l: 35 } },
  { label: '自由', emoji: '🕊', hsl: { h: 170, s: 55, l: 55 } },
  { label: '热情', emoji: '❤️', hsl: { h: 350, s: 75, l: 50 } },
  { label: '清新', emoji: '🍃', hsl: { h: 140, s: 55, l: 55 } },
  { label: '浪漫', emoji: '🌸', hsl: { h: 330, s: 60, l: 65 } },
  { label: '力量', emoji: '⚡', hsl: { h: 45, s: 90, l: 50 } },
  { label: '梦幻', emoji: '✨', hsl: { h: 280, s: 55, l: 60 } },
  { label: '沉稳', emoji: '🪨', hsl: { h: 30, s: 25, l: 40 } },
];

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function clampH(val: number): number {
  return ((val % 360) + 360) % 360;
}

function clampL(val: number): number {
  return Math.max(10, Math.min(90, val));
}

function clampS(val: number): number {
  return Math.max(15, Math.min(100, val));
}

export function generatePalette(keyword: string): string[] {
  const entry = KEYWORDS.find((k) => k.label === keyword);
  if (!entry) return ['#888888'];

  const { h, s, l } = entry.hsl;

  const colors: HSL[] = [
    { h, s, l },
    { h: clampH(h + 180), s: clampS(s - 10), l: clampL(l + 5) },
    { h: clampH(h + 35), s: clampS(s * 0.8), l: clampL(l + 8) },
    { h: clampH(h - 35), s: clampS(s * 0.8), l: clampL(l + 8) },
    { h, s: clampS(s * 0.5), l: clampL(l + 18) },
  ];

  return colors.map((c) => hslToHex(c.h, c.s, c.l));
}

export function generateRandomPalette(): string[] {
  const randomH = Math.random() * 360;
  const randomS = 40 + Math.random() * 50;
  const randomL = 35 + Math.random() * 35;

  const colors: HSL[] = [
    { h: randomH, s: randomS, l: randomL },
    { h: clampH(randomH + 180), s: clampS(randomS - 10), l: clampL(randomL + 5) },
    { h: clampH(randomH + 35), s: clampS(randomS * 0.8), l: clampL(randomL + 8) },
    { h: clampH(randomH - 35), s: clampS(randomS * 0.8), l: clampL(randomL + 8) },
    { h: randomH, s: clampS(randomS * 0.5), l: clampL(randomL + 18) },
  ];

  return colors.map((c) => hslToHex(c.h, c.s, c.l));
}
