import type { AnimationConfig, AnimationType, EasingType } from '@/types/animation'

export function getAnimationKeyframes(type: AnimationType): string {
  switch (type) {
    case 'translate':
      return `@keyframes anim-translate {
  0%   { transform: translateX(0); }
  50%  { transform: translateX(60px); }
  100% { transform: translateX(0); }
}`
    case 'rotate':
      return `@keyframes anim-rotate {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`
    case 'scale':
      return `@keyframes anim-scale {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.5); }
  100% { transform: scale(1); }
}`
    case 'color':
      return `@keyframes anim-color {
  0%   { background-color: #8B5CF6; }
  50%  { background-color: #3B82F6; }
  100% { background-color: #8B5CF6; }
}`
    case 'bounce':
      return `@keyframes anim-bounce {
  0%   { transform: translateY(0); }
  30%  { transform: translateY(-50px); }
  50%  { transform: translateY(0); }
  70%  { transform: translateY(-25px); }
  100% { transform: translateY(0); }
}`
    default:
      return ''
  }
}

export function getAnimationName(type: AnimationType): string {
  return `anim-${type}`
}

export function formatEasing(config: AnimationConfig): string {
  if (config.easing === 'cubic-bezier') {
    const [x1, y1, x2, y2] = config.cubicBezier
    return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`
  }
  return config.easing
}

export function generateCSS(config: AnimationConfig): string {
  const keyframes = getAnimationKeyframes(config.type)
  const animationName = getAnimationName(config.type)
  const easing = formatEasing(config)

  return `${keyframes}

.element {
  animation: ${animationName} ${config.duration}s ${easing} ${config.delay}s infinite;
}`
}

export type HighlightType = 'duration' | 'delay' | 'easing' | 'bezier-number'

export interface HighlightedPart {
  text: string
  isHighlight: boolean
  type?: HighlightType
}

export const HIGHLIGHT_CSS_CLASSES: Record<HighlightType, string> = {
  duration: 'highlight-duration',
  delay: 'highlight-delay',
  easing: 'highlight-easing',
  'bezier-number': 'highlight-bezier-number'
}

export function generateHighlightedCSS(config: AnimationConfig): HighlightedPart[] {
  const rawCSS = generateCSS(config)
  const parts: HighlightedPart[] = []

  const durationStr = `${config.duration.toFixed(1)}s`
  const delayStr = `${config.delay.toFixed(1)}s`
  const easingValue = formatEasing(config)

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  let lastIndex = 0
  const tokens: Array<{ start: number; end: number; text: string; type: HighlightType }> = []

  const collectToken = (pattern: string, type: HighlightType, excludeInside = false) => {
    const regex = new RegExp(
      excludeInside
        ? `(?<!cubic-bezier\\([^)]*)${escapeRegex(pattern)}`
        : escapeRegex(pattern),
      'g'
    )
    let match: RegExpExecArray | null
    while ((match = regex.exec(rawCSS)) !== null) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        type
      })
    }
  }

  collectToken(durationStr, 'duration', true)
  collectToken(delayStr, 'delay', true)

  if (easingValue !== 'ease') {
    collectToken(easingValue, 'easing', true)
  }

  const bezierRegex = /cubic-bezier\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/g
  let bezierMatch: RegExpExecArray | null
  while ((bezierMatch = bezierRegex.exec(rawCSS)) !== null) {
    for (let i = 1; i <= 4; i++) {
      const numStr = bezierMatch[i]
      const offset = bezierMatch.index + bezierMatch[0].indexOf(numStr)
      tokens.push({
        start: offset,
        end: offset + numStr.length,
        text: numStr,
        type: 'bezier-number'
      })
    }
  }

  tokens.sort((a, b) => a.start - b.start)

  const merged: typeof tokens = []
  for (const t of tokens) {
    if (merged.length === 0 || t.start >= merged[merged.length - 1].end) {
      merged.push(t)
    }
  }

  for (const t of merged) {
    if (t.start > lastIndex) {
      parts.push({ text: rawCSS.slice(lastIndex, t.start), isHighlight: false })
    }
    parts.push({ text: t.text, isHighlight: true, type: t.type })
    lastIndex = t.end
  }
  if (lastIndex < rawCSS.length) {
    parts.push({ text: rawCSS.slice(lastIndex), isHighlight: false })
  }

  if (parts.length === 0) {
    parts.push({ text: rawCSS, isHighlight: false })
  }
  return parts
}
