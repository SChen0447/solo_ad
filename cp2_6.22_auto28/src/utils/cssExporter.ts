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

export interface HighlightedPart {
  text: string
  isHighlight: boolean
  type?: 'duration' | 'delay' | 'easing' | 'number'
}

export function generateHighlightedCSS(config: AnimationConfig): HighlightedPart[] {
  const rawCSS = generateCSS(config)
  const parts: HighlightedPart[] = []

  const durationPattern = new RegExp(`(${config.duration}s)`, 'g')
  const delayPattern = new RegExp(`(${config.delay}s)`, 'g')
  const easingValue = formatEasing(config)

  let lastIndex = 0
  const tokens: Array<{ start: number; end: number; text: string; type: HighlightedPart['type'] }> = []

  const collectToken = (regex: RegExp, type: HighlightedPart['type']) => {
    let match: RegExpExecArray | null
    const re = new RegExp(regex.source, 'g')
    while ((match = re.exec(rawCSS)) !== null) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        type
      })
    }
  }

  collectToken(durationPattern, 'duration')
  collectToken(delayPattern, 'delay')

  if (easingValue !== 'ease') {
    const easingRegex = new RegExp(`(${easingValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g')
    let em: RegExpExecArray | null
    while ((em = easingRegex.exec(rawCSS)) !== null) {
      tokens.push({
        start: em.index,
        end: em.index + em[0].length,
        text: em[0],
        type: 'easing'
      })
    }
  }

  const cubicBezierNums = rawCSS.matchAll(/cubic-bezier\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/g)
  for (const m of cubicBezierNums) {
    for (let i = 1; i <= 4; i++) {
      const offset = m.index! + m[0].indexOf(m[i])
      tokens.push({
        start: offset,
        end: offset + m[i].length,
        text: m[i],
        type: 'number'
      })
    }
  }

  tokens.sort((a, b) => a.start - b.start)

  for (const t of tokens) {
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
