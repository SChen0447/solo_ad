export interface EasingCurve {
  id: string;
  name: string;
  value: string;
  type: 'preset' | 'cubic-bezier' | 'spring' | 'elastic';
  points?: [number, number, number, number];
}

export interface AnimationParams {
  duration: number;
  delay: number;
  iterationCount: number | 'infinite';
}

export function generateCssCode(curve: EasingCurve, params: AnimationParams): string {
  const iterations = params.iterationCount === 'infinite' ? 'infinite' : String(params.iterationCount);

  return `/* CSS Animation with ${curve.name} easing */
.animated-element {
  -webkit-transition: all ${params.duration}s ${curve.value} ${params.delay}s;
  -moz-transition: all ${params.duration}s ${curve.value} ${params.delay}s;
  -ms-transition: all ${params.duration}s ${curve.value} ${params.delay}s;
  -o-transition: all ${params.duration}s ${curve.value} ${params.delay}s;
  transition: all ${params.duration}s ${curve.value} ${params.delay}s;

  -webkit-animation-timing-function: ${curve.value};
  -moz-animation-timing-function: ${curve.value};
  -ms-animation-timing-function: ${curve.value};
  -o-animation-timing-function: ${curve.value};
  animation-timing-function: ${curve.value};

  -webkit-animation-duration: ${params.duration}s;
  animation-duration: ${params.duration}s;

  -webkit-animation-delay: ${params.delay}s;
  animation-delay: ${params.delay}s;

  -webkit-animation-iteration-count: ${iterations};
  animation-iteration-count: ${iterations};
}

/* For keyframe animations */
@-webkit-keyframes myAnimation {
  from { /* start state */ }
  to { /* end state */ }
}

@keyframes myAnimation {
  from { /* start state */ }
  to { /* end state */ }
}`;
}

export async function exportCss(curve: EasingCurve, params: AnimationParams): Promise<string> {
  const code = generateCssCode(curve, params);

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (err) {
    console.warn('Failed to copy to clipboard:', err);
  }

  return code;
}

export const CURVES: EasingCurve[] = [
  { id: 'ease', name: 'ease', value: 'ease', type: 'preset' },
  { id: 'ease-in', name: 'ease-in', value: 'ease-in', type: 'preset' },
  { id: 'ease-out', name: 'ease-out', value: 'ease-out', type: 'preset' },
  { id: 'ease-in-out', name: 'ease-in-out', value: 'ease-in-out', type: 'preset' },
  { id: 'linear', name: 'linear', value: 'linear', type: 'preset' },
  { id: 'cubic-bezier', name: 'Cubic Bezier', value: 'cubic-bezier(0.25, 0.1, 0.25, 1)', type: 'cubic-bezier', points: [0.25, 0.1, 0.25, 1] },
  { id: 'spring', name: 'Spring', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', type: 'spring' },
  { id: 'elastic', name: 'Elastic', value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', type: 'elastic' },
];

export const COLOR_PALETTE = [
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
];
