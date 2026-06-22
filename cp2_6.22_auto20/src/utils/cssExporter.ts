import { AnimationConfig } from '@/types/animation';

const getKeyframesContent = (type: string): string => {
  switch (type) {
    case 'translate':
      return `  0%, 100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(40px);
  }`;
    case 'rotate':
      return `  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }`;
    case 'scale':
      return `  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }`;
    case 'color':
      return `  0% {
    background-color: #8B5CF6;
  }
  50% {
    background-color: #3B82F6;
  }
  100% {
    background-color: #8B5CF6;
  }`;
    case 'bounce':
      return `  0%, 100% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(-30px);
  }
  50% {
    transform: translateY(0);
  }
  75% {
    transform: translateY(-15px);
  }`;
    default:
      return '';
  }
};

const getAnimationName = (type: string): string => {
  const names: Record<string, string> = {
    translate: 'slide',
    rotate: 'spin',
    scale: 'pulse',
    color: 'colorShift',
    bounce: 'bounce',
  };
  return names[type] || 'animation';
};

export const generateCSS = (config: AnimationConfig): string => {
  const animationName = getAnimationName(config.type);
  const keyframesContent = getKeyframesContent(config.type);
  
  const easingValue = config.easing === 'cubic-bezier'
    ? `cubic-bezier(${config.cubicBezier.map(v => v.toFixed(2)).join(', ')})`
    : config.easing;

  const iterationCount = config.iterationCount === 'infinite' 
    ? 'infinite' 
    : String(config.iterationCount);

  const css = `@keyframes ${animationName} {
${keyframesContent}
}

.animated-element {
  animation: ${animationName} ${config.duration}s ${easingValue} ${config.delay}s ${iterationCount};
}`;

  return css;
};

export const generateHighlightedCSS = (config: AnimationConfig): { code: string; highlights: Array<{ start: number; end: number; text: string }> } => {
  const code = generateCSS(config);
  const highlights: Array<{ start: number; end: number; text: string }> = [];

  const durationStr = `${config.duration}s`;
  const durationIndex = code.indexOf(durationStr, code.indexOf('animation:'));
  if (durationIndex > -1) {
    highlights.push({
      start: durationIndex,
      end: durationIndex + durationStr.length,
      text: durationStr,
    });
  }

  const delayStr = `${config.delay}s`;
  const delayRegex = new RegExp(`${delayStr} ${config.iterationCount === 'infinite' ? 'infinite' : config.iterationCount}`);
  const delayMatch = code.match(delayRegex);
  if (delayMatch && delayMatch.index !== undefined) {
    highlights.push({
      start: delayMatch.index,
      end: delayMatch.index + delayStr.length,
      text: delayStr,
    });
  }

  const easingValue = config.easing === 'cubic-bezier'
    ? `cubic-bezier(${config.cubicBezier.map(v => v.toFixed(2)).join(', ')})`
    : config.easing;
  const easingRegex = new RegExp(easingValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const easingMatch = code.match(easingRegex);
  if (easingMatch && easingMatch.index !== undefined) {
    highlights.push({
      start: easingMatch.index,
      end: easingMatch.index + easingValue.length,
      text: easingValue,
    });
  }

  return { code, highlights };
};
