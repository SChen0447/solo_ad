export type AnimationType = 'translate' | 'rotate' | 'scale' | 'opacity';
export type AnimationDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';

export interface AnimationClip {
  id: string;
  selector: string;
  type: AnimationType;
  startValue: number;
  endValue: number;
  startTime: number;
  duration: number;
  easing: string;
  iterationCount: number | 'infinite';
  direction: AnimationDirection;
}

export const EASING_FUNCTIONS: Record<string, string> = {
  linear: 'linear',
  ease: 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  'bounce-in': 'cubic-bezier(0.6, -0.28, 0.74, 0.05)',
  'bounce-out': 'cubic-bezier(0.18, 0.89, 0.32, 1.28)',
  elastic: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  'back-in': 'cubic-bezier(0.6, -0.28, 0.74, 0.05)',
  'back-out': 'cubic-bezier(0.18, 0.89, 0.32, 1.28)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

function parseCubicBezier(easingStr: string): [number, number, number, number] | null {
  const match = easingStr.match(/^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/);
  if (!match) return null;
  return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]), parseFloat(match[4])];
}

function cubicBezierY(x1: number, y1: number, x2: number, y2: number, t: number): number {
  function sampleX(u: number): number {
    return 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
  }

  function sampleY(u: number): number {
    return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  }

  function sampleDerivativeX(u: number): number {
    return 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
  }

  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = sampleX(u) - t;
    if (Math.abs(x) < 1e-6) break;
    const dx = sampleDerivativeX(u);
    if (Math.abs(dx) < 1e-6) break;
    u -= x / dx;
  }

  u = Math.max(0, Math.min(1, u));
  return sampleY(u);
}

export function applyEasing(t: number, easingName: string): number {
  if (easingName === 'linear') return t;

  const namedEasings: Record<string, string> = {
    ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    'ease-in': 'cubic-bezier(0.42, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.58, 1)',
    'ease-in-out': 'cubic-bezier(0.42, 0, 0.58, 1)',
  };

  let easingStr = EASING_FUNCTIONS[easingName] ?? easingName;

  if (namedEasings[easingName]) {
    easingStr = namedEasings[easingName];
  }

  const parsed = parseCubicBezier(easingStr);
  if (parsed) {
    return cubicBezierY(parsed[0], parsed[1], parsed[2], parsed[3], t);
  }

  return t;
}

function interpolateValue(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function formatProperty(type: AnimationType, value: number): string {
  switch (type) {
    case 'translate':
      return `transform: translateX(${value}px)`;
    case 'rotate':
      return `transform: rotate(${value}deg)`;
    case 'scale':
      return `transform: scale(${value})`;
    case 'opacity':
      return `opacity: ${value}`;
  }
}

export function generateKeyframes(clip: AnimationClip): string {
  const name = `anim-${clip.id}`;
  const steps = [0, 25, 50, 75, 100];
  const lines: string[] = [`@keyframes ${name} {`];

  for (const step of steps) {
    const t = step / 100;
    const easedT = applyEasing(t, clip.easing);
    const value = interpolateValue(clip.startValue, clip.endValue, easedT);
    const prop = formatProperty(clip.type, value);
    lines.push(`  ${step}% { ${prop}; }`);
  }

  lines.push('}');
  return lines.join('\n');
}

export function generateAnimationCSS(clip: AnimationClip): string {
  const name = `anim-${clip.id}`;
  const duration = `${clip.duration}s`;
  const easing = EASING_FUNCTIONS[clip.easing] ?? clip.easing;
  const count = clip.iterationCount === 'infinite' ? 'infinite' : String(clip.iterationCount);
  const direction = clip.direction;
  const delay = clip.startTime > 0 ? `${clip.startTime}s ` : '';
  return `${clip.selector} { animation: ${name} ${duration} ${easing} ${delay}${count} ${direction}; }`;
}

export function generateFullCSS(clip: AnimationClip): string {
  return generateKeyframes(clip) + '\n\n' + generateAnimationCSS(clip);
}

export function generateExportCode(clips: AnimationClip[]): string {
  const timestamp = new Date().toISOString();
  const allKeyframes = clips.map(clip => generateKeyframes(clip)).join('\n\n');
  const allStyles = clips.map(clip => generateAnimationCSS(clip)).join('\n');

  return `/**
 * CSS Animation Workbench - Auto Generated
 * Generated at: ${timestamp}
 */

class CssAnimation {
  constructor() {
    this.style = null;
    this.animations = {};
  }

  apply(selector) {
    if (this.style) {
      this.remove();
    }
    this.style = document.createElement('style');
    this.style.setAttribute('type', 'text/css');
    this.style.setAttribute('data-css-animation', selector || '');
    const keyframes = CssAnimation.keyframes;
    const styles = CssAnimation.styles;
    this.style.textContent = keyframes + '\\n' + styles;
    document.head.appendChild(this.style);
  }

  remove() {
    if (this.style && this.style.parentNode) {
      this.style.parentNode.removeChild(this.style);
      this.style = null;
    }
  }
}

CssAnimation.keyframes = \`${allKeyframes}\`;
CssAnimation.styles = \`${allStyles}\`;

export default CssAnimation;`;
}

export function highlightCSS(css: string): string {
  const tokens: Array<{ match: string; cls: string }> = [];
  const tokenRegex = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|@\w+|\b(from|to)\b(?=\s*\{)|([.#][\w-]+)|(\{|\})|([\d.]+)(?=px|deg|s|%)|([\w-]+)(?=\s*:)|((?:px|deg|s|%))/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(css)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(css.slice(lastIndex, match.index));
    }

    const full = match[0];

    if (full.startsWith('//') || full.startsWith('/*')) {
      result += wrapSpan(full, 'code-highlight-comment');
    } else if (full.startsWith('@')) {
      result += wrapSpan(full, 'code-highlight-keyword');
    } else if (full === 'from' || full === 'to') {
      result += wrapSpan(full, 'code-highlight-keyword');
    } else if (full.startsWith('#') || full.startsWith('.')) {
      result += wrapSpan(full, 'code-highlight-selector');
    } else if (full === '{' || full === '}') {
      result += wrapSpan(full, 'code-highlight-bracket');
    } else if (/^\d/.test(full) && (css.slice(match.index + full.length, match.index + full.length + 2).match(/^px|deg/) || css.slice(match.index + full.length, match.index + full.length + 1).match(/^s|%$/))) {
      result += wrapSpan(full, 'code-highlight-number');
    } else if (/^(px|deg|s|%)$/.test(full)) {
      result += wrapSpan(full, 'code-highlight-value');
    } else if (/^\d/.test(full)) {
      result += wrapSpan(full, 'code-highlight-number');
    } else if (/^[a-zA-Z]/.test(full)) {
      result += wrapSpan(full, 'code-highlight-property');
    } else {
      result += escapeHtml(full);
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < css.length) {
    result += escapeHtml(css.slice(lastIndex));
  }

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrapSpan(text: string, cls: string): string {
  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}
