import { AnimationParams } from './store'

export interface ParsedAnimation {
  keyframes: string
  animationName: string
  hasAnimation: boolean
  hasTransition: boolean
  transitionProperties: string
}

export function parseCSS(code: string): ParsedAnimation {
  const result: ParsedAnimation = {
    keyframes: '',
    animationName: '',
    hasAnimation: false,
    hasTransition: false,
    transitionProperties: ''
  }

  const keyframesMatch = code.match(/@keyframes\s+(\w+)\s*{([^}]+(?:{[^}]*}[^}]*)*)}/s)
  if (keyframesMatch) {
    result.animationName = keyframesMatch[1]
    result.keyframes = `@keyframes ${keyframesMatch[1]} {${keyframesMatch[2]}}`
    result.hasAnimation = true
  }

  const transitionMatch = code.match(/transition\s*:\s*([^;]+);/i)
  if (transitionMatch) {
    result.hasTransition = true
    result.transitionProperties = transitionMatch[1].trim()
  }

  return result
}

export function generateAnimationStyle(
  parsed: ParsedAnimation,
  params: AnimationParams
): React.CSSProperties {
  const timingFunction = params.useCubicBezier
    ? `cubic-bezier(${params.cubicBezier.x1}, ${params.cubicBezier.y1}, ${params.cubicBezier.x2}, ${params.cubicBezier.y2})`
    : params.timingFunction

  const style: React.CSSProperties = {}

  if (parsed.hasAnimation && parsed.animationName) {
    style.animationName = parsed.animationName
    style.animationDuration = `${params.duration}s`
    style.animationDelay = `${params.delay}s`
    style.animationIterationCount = params.iterations === 10 ? 'infinite' : params.iterations
    style.animationTimingFunction = timingFunction
    style.animationFillMode = 'both'
  }

  if (parsed.hasTransition) {
    style.transition = parsed.transitionProperties
      .replace(/\d+\.?\d*s/g, `${params.duration}s`)
      .replace(/(ease|linear|ease-in|ease-out|ease-in-out)/g, timingFunction)
  }

  return style
}

export function generateExportCode(
  code: string,
  params: AnimationParams
): string {
  const parsed = parseCSS(code)
  const timingFunction = params.useCubicBezier
    ? `cubic-bezier(${params.cubicBezier.x1}, ${params.cubicBezier.y1}, ${params.cubicBezier.x2}, ${params.cubicBezier.y2})`
    : params.timingFunction

  const iterations = params.iterations === 10 ? 'infinite' : params.iterations

  const animationProps = `/* 动画持续时间 */
  animation-duration: ${params.duration}s;
  /* 动画延迟时间 */
  animation-delay: ${params.delay}s;
  /* 动画重复次数 */
  animation-iteration-count: ${iterations};
  /* 动画速度曲线 */
  animation-timing-function: ${timingFunction};
  /* 动画填充模式 */
  animation-fill-mode: both;`

  if (parsed.keyframes) {
    return `${parsed.keyframes}

.animated-element {
  /* 动画名称 */
  animation-name: ${parsed.animationName};
  ${animationProps}
}
`
  }

  return `.animated-element {
  ${animationProps}
}
`
}

export function getAnimationDescription(params: AnimationParams): string {
  const timingDesc = params.useCubicBezier
    ? `cubic-bezier(${params.cubicBezier.x1.toFixed(2)}, ${params.cubicBezier.y1.toFixed(2)}, ${params.cubicBezier.x2.toFixed(2)}, ${params.cubicBezier.y2.toFixed(2)})曲线`
    : `使用${params.timingFunction}曲线`

  const iterationsDesc = params.iterations === 10 ? '无限循环' : `重复${params.iterations}次`

  return `动画在${params.duration}s内完成，延迟${params.delay}s，${iterationsDesc}，${timingDesc}`
}
