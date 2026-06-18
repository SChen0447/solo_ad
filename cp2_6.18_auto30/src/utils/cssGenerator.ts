import type { ColorStop, GradientType, AnimationParams } from '@/types';

export function generateGradientCSS(
  colorStops: ColorStop[],
  gradientType: GradientType,
  angle: number
): string {
  const stops = [...colorStops]
    .sort((a, b) => a.position - b.position)
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(', ');

  if (gradientType === 'linear') {
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  return `radial-gradient(circle, ${stops})`;
}

export function generateBackgroundCSS(
  colorStops: ColorStop[],
  gradientType: GradientType,
  angle: number
): string {
  return `background: ${generateGradientCSS(colorStops, gradientType, angle)};`;
}

export function generateAnimationCSS(params: AnimationParams): string {
  const easing =
    params.easing === 'cubic-bezier'
      ? params.cubicBezierValue
      : params.easing;

  return [
    `animation-duration: ${params.duration}s;`,
    `animation-delay: ${params.delay}s;`,
    `animation-timing-function: ${easing};`,
    `animation-iteration-count: infinite;`,
    `animation-direction: alternate;`,
  ].join('\n  ');
}

export function generateFullCSS(
  colorStops: ColorStop[],
  gradientType: GradientType,
  angle: number,
  params: AnimationParams,
  animated: boolean
): string {
  const bg = generateBackgroundCSS(colorStops, gradientType, angle);
  if (!animated) {
    return bg;
  }
  const anim = generateAnimationCSS(params);
  return `background-image: ${generateGradientCSS(colorStops, gradientType, angle)};\n  background-size: 200% 200%;\n  ${anim}`;
}
