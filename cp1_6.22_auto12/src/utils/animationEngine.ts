export type AnimationStyle =
  | 'typewriter'
  | 'rotate'
  | 'wave'
  | 'particle'
  | 'neon';

export interface KeyframePositions {
  k0: number;
  k25: number;
  k50: number;
  k100: number;
}

export interface CharState {
  char: string;
  x: number;
  y: number;
  opacity: number;
  rotation: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface Particle {
  id: number;
  charIndex: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  opacity: number;
  angle: number;
  distance: number;
}

export interface AnimationConfig {
  text: string;
  style: AnimationStyle;
  fontSize: number;
  color: string;
  duration: number;
  waveAmplitude: number;
}

const TWO_PI = Math.PI * 2;

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function mapKeyframes(t: number, kp: KeyframePositions): number {
  const tt = clamp(t, 0, 1);
  const points = [
    { norm: 0, pos: kp.k0 / 100 },
    { norm: 0.25, pos: kp.k25 / 100 },
    { norm: 0.5, pos: kp.k50 / 100 },
    { norm: 1, pos: kp.k100 / 100 },
  ];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (tt >= a.norm && tt <= b.norm) {
      const seg = (tt - a.norm) / (b.norm - a.norm);
      return lerp(a.pos, b.pos, seg);
    }
  }
  return tt;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function initCharStates(
  chars: string[],
  fontSize: number,
  canvasWidth: number,
  canvasHeight: number
): CharState[] {
  const spacing = fontSize * 0.7;
  const totalWidth = (chars.length - 1) * spacing;
  const startX = (canvasWidth - totalWidth) / 2;
  const baseY = canvasHeight / 2 + fontSize * 0.35;

  return chars.map((ch, i) => ({
    char: ch,
    x: startX + i * spacing,
    y: baseY,
    opacity: 1,
    rotation: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  }));
}

export function initParticles(
  chars: string[],
  fontSize: number,
  canvasWidth: number,
  canvasHeight: number,
  color: string
): Particle[] {
  const spacing = fontSize * 0.7;
  const totalWidth = (chars.length - 1) * spacing;
  const startX = (canvasWidth - totalWidth) / 2;
  const baseY = canvasHeight / 2 + fontSize * 0.35;
  const particlesPerChar = 30;
  const particles: Particle[] = [];
  const rand = seededRandom(42);

  chars.forEach((_, charIndex) => {
    const cx = startX + charIndex * spacing;
    const cy = baseY;
    for (let i = 0; i < particlesPerChar; i++) {
      const id = charIndex * particlesPerChar + i;
      const angle = rand() * TWO_PI;
      const distance = 80 + rand() * 200;
      const jx = (rand() - 0.5) * fontSize * 0.5;
      const jy = (rand() - 0.5) * fontSize * 0.5;
      particles.push({
        id,
        charIndex,
        x: cx + jx,
        y: cy + jy,
        targetX: cx + jx,
        targetY: cy + jy,
        baseX: cx + jx,
        baseY: cy + jy,
        vx: 0,
        vy: 0,
        color,
        radius: 1.5 + rand() * 2,
        opacity: 1,
        angle,
        distance,
      });
    }
  });
  return particles;
}

export function animateTypewriter(
  states: CharState[],
  normT: number,
  fontSize: number
): CharState[] {
  const len = states.length;
  return states.map((s, i) => {
    const startT = len <= 1 ? 0 : i / (len * 1.2);
    const endT = startT + 0.25;
    if (normT < startT) {
      return { ...s, opacity: 0, offsetY: 0 };
    } else if (normT < endT) {
      const local = (normT - startT) / (endT - startT);
      const bounce = local < 0.6 ? 0 : easeOutBack((local - 0.6) / 0.4);
      return {
        ...s,
        opacity: easeOutCubic(local),
        offsetY: -bounce * fontSize * 0.2,
      };
    } else {
      return { ...s, opacity: 1, offsetY: 0 };
    }
  });
}

export function animateRotate(
  states: CharState[],
  normT: number,
  _fontSize: number
): CharState[] {
  const rand = seededRandom(123);
  const len = states.length;
  return states.map((s, i) => {
    const startAngle = (rand() * 360 - 180) * (1 + i * 0.05);
    const startT = len <= 1 ? 0 : (i / len) * 0.4;
    const endT = Math.min(1, startT + 0.6);
    if (normT < startT) {
      return { ...s, opacity: 0, rotation: startAngle, scale: 0.3 };
    } else if (normT < endT) {
      const local = (normT - startT) / (endT - startT);
      const eased = easeOutCubic(local);
      return {
        ...s,
        opacity: eased,
        rotation: lerp(startAngle, 0, eased),
        scale: lerp(0.3, 1, eased),
      };
    } else {
      return { ...s, opacity: 1, rotation: 0, scale: 1 };
    }
  });
}

export function animateWave(
  states: CharState[],
  normT: number,
  amplitude: number
): CharState[] {
  const phase = normT * TWO_PI * 1.5;
  return states.map((s, i) => ({
    ...s,
    offsetY: Math.sin(phase + i * 0.6) * amplitude,
  }));
}

export function animateParticles(
  particles: Particle[],
  normT: number,
  canvasWidth: number,
  canvasHeight: number
): Particle[] {
  return particles.map((p) => {
    if (normT < 0.5) {
      const t = normT / 0.5;
      const eased = easeInOutQuad(t);
      const dx = Math.cos(p.angle) * p.distance * eased;
      const dy = Math.sin(p.angle) * p.distance * eased;
      let x = p.baseX + dx;
      let y = p.baseY + dy;
      x = clamp(x, -20, canvasWidth + 20);
      y = clamp(y, -20, canvasHeight + 20);
      return { ...p, x, y, opacity: 1 - eased * 0.6 };
    } else {
      const t = (normT - 0.5) / 0.5;
      const eased = easeOutCubic(t);
      const startX = p.baseX + Math.cos(p.angle) * p.distance;
      const startY = p.baseY + Math.sin(p.angle) * p.distance;
      return {
        ...p,
        x: lerp(startX, p.baseX, eased),
        y: lerp(startY, p.baseY, eased),
        opacity: 0.4 + eased * 0.6,
      };
    }
  });
}

export function animateNeon(
  states: CharState[],
  normT: number,
  baseColor: string
): { states: CharState[]; glowIntensity: number; glowColor: string; whiteMix: number } {
  const cycle = (normT * 5) % 1;
  const neonPhase = Math.sin(cycle * TWO_PI);
  const glowIntensity = 0.5 + neonPhase * 0.5;
  const whiteMix = 0.3 + neonPhase * 0.7;
  const rand = seededRandom(Math.floor(normT * 50));
  const jittered = states.map((s) => ({
    ...s,
    offsetX: (rand() - 0.5) * 1.5,
    offsetY: (rand() - 0.5) * 1.5,
  }));
  return { states: jittered, glowIntensity, glowColor: baseColor, whiteMix };
}

export function mixColorWithWhite(hex: string, whiteRatio: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const mr = Math.round(r + (255 - r) * whiteRatio);
  const mg = Math.round(g + (255 - g) * whiteRatio);
  const mb = Math.round(b + (255 - b) * whiteRatio);
  return `rgb(${mr},${mg},${mb})`;
}

export interface RenderResult {
  charStates: CharState[];
  particles: Particle[];
  neonGlow?: { intensity: number; color: string };
  showText: boolean;
}

export function computeFrame(
  config: AnimationConfig,
  keyframes: KeyframePositions,
  rawT: number,
  canvasWidth: number,
  canvasHeight: number,
  cachedChars: string[],
  cachedParticles: Particle[]
): RenderResult {
  const normT = mapKeyframes(rawT % 1, keyframes);
  const charStates = initCharStates(cachedChars, config.fontSize, canvasWidth, canvasHeight);

  switch (config.style) {
    case 'typewriter': {
      return {
        charStates: animateTypewriter(charStates, normT, config.fontSize),
        particles: [],
        showText: true,
      };
    }
    case 'rotate': {
      return {
        charStates: animateRotate(charStates, normT, config.fontSize),
        particles: [],
        showText: true,
      };
    }
    case 'wave': {
      return {
        charStates: animateWave(charStates, normT, config.waveAmplitude),
        particles: [],
        showText: true,
      };
    }
    case 'particle': {
      const particles = animateParticles(cachedParticles, normT, canvasWidth, canvasHeight);
      const textOpacity = normT < 0.5 ? 1 - normT * 1.8 : (normT - 0.5) * 2 - 0.1;
      const showText = textOpacity > 0.05;
      return {
        charStates: charStates.map((s) => ({
          ...s,
          opacity: showText ? clamp(textOpacity, 0, 1) : 0,
        })),
        particles,
        showText,
      };
    }
    case 'neon': {
      const { states, glowIntensity, glowColor, whiteMix } = animateNeon(
        charStates,
        normT,
        config.color
      );
      const mixedColor = mixColorWithWhite(glowColor, whiteMix * 0.6);
      return {
        charStates: states.map((s) => ({ ...s, char: s.char })),
        particles: [],
        showText: true,
        neonGlow: { intensity: glowIntensity, color: mixedColor },
      };
    }
  }
}
