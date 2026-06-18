import type { AnimationParams, TimingPreset } from './store'

const PRESET_MAP: Record<Exclude<TimingPreset, 'custom'>, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
}

export function getTimingFunction(params: AnimationParams): string {
  if (params.timingPreset === 'custom') {
    return `cubic-bezier(${params.cubicBezier.join(', ')})`
  }
  return params.timingPreset
}

export function getBezierValues(preset: TimingPreset, custom: [number, number, number, number]): [number, number, number, number] {
  if (preset === 'custom') return custom
  return PRESET_MAP[preset]
}

export interface ParsedAnimation {
  keyframes: string
  animationName: string | null
  transitionProperties: string | null
}

export function parseCSS(code: string): ParsedAnimation {
  const keyframesMatch = code.match(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\}(?=\s*@|\s*$|\s*\.)/i)
  const transitionMatch = code.match(/transition\s*:\s*([^;]+);?/i)
  const animationNameMatch = code.match(/animation(?:-name)?\s*:\s*[\w\s,]*?([\w-]+)[\w\s,]*?;/i)

  let animationName: string | null = null
  if (keyframesMatch) {
    animationName = keyframesMatch[1]
  } else if (animationNameMatch) {
    animationName = animationNameMatch[1]
  }

  return {
    keyframes: keyframesMatch ? keyframesMatch[0] : '',
    animationName,
    transitionProperties: transitionMatch ? transitionMatch[1].trim() : null,
  }
}

export function generateAnimationStyle(
  parsed: ParsedAnimation,
  params: AnimationParams,
  useOriginal = false
): React.CSSProperties {
  const iterations = params.iterations === 10 ? 'infinite' : params.iterations

  if (parsed.transitionProperties && !parsed.animationName) {
    return {
      transition: `${parsed.transitionProperties.replace(/[\d.]+\s*s/g, `${params.duration}s`)}`,
      transitionDelay: `${params.delay}s`,
      transitionTimingFunction: useOriginal ? 'ease' : getTimingFunction(params),
    }
  }

  if (parsed.animationName) {
    return {
      animationName: parsed.animationName,
      animationDuration: `${params.duration}s`,
      animationDelay: `${params.delay}s`,
      animationIterationCount: iterations,
      animationTimingFunction: useOriginal ? 'ease' : getTimingFunction(params),
      animationFillMode: 'both',
    }
  }

  return {}
}

export function generateDescription(params: AnimationParams): string {
  const iterations = params.iterations === 10 ? '无限循环' : `重复${params.iterations}次`
  const timing = params.timingPreset === 'custom'
    ? `自定义cubic-bezier(${params.cubicBezier.map(v => v.toFixed(2)).join(', ')})曲线`
    : `使用${params.timingPreset}曲线`
  return `动画在${params.duration}s内完成，延迟${params.delay}s，${iterations}，${timing}`
}

export function generateExportCode(code: string, params: AnimationParams): string {
  const parsed = parseCSS(code)
  const timingFunc = getTimingFunction(params)
  const iterations = params.iterations === 10 ? 'infinite' : params.iterations

  let keyframesDef = parsed.keyframes
  if (!keyframesDef) {
    keyframesDef = `/* 未检测到 @keyframes 定义，请确保代码中包含完整的关键帧 */`
  }

  const exportName = parsed.animationName || 'customAnimation'

  return `/* ============================================
   CSS Animation 导出代码
   生成时间: ${new Date().toISOString()}
   ============================================ */

/* ---------- 关键帧定义 ---------- */
${keyframesDef}

/* ---------- 动画应用样式 ---------- */
.animated-element {
  /* 动画名称 - 对应 @keyframes 定义 */
  animation-name: ${exportName};

  /* 持续时间 - 动画从开始到结束的时间 (0.1s ~ 10s) */
  animation-duration: ${params.duration}s;

  /* 延迟时间 - 动画开始前的等待时间 (0s ~ 5s) */
  animation-delay: ${params.delay}s;

  /* 重复次数 - 动画播放次数 (1~10 或 infinite) */
  animation-iteration-count: ${iterations};

  /* 速度曲线 - 控制动画的加速度变化 */
  animation-timing-function: ${timingFunc};

  /* 填充模式 - 动画执行前后的状态保持 */
  animation-fill-mode: both;
}

/* ---------- 简写形式 ---------- */
.animated-element-shorthand {
  animation: ${exportName} ${params.duration}s ${timingFunc} ${params.delay}s ${iterations} both;
}
`
}

export function injectKeyframesStyle(code: string, styleId: string): void {
  const parsed = parseCSS(code)
  if (!parsed.keyframes) return

  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = parsed.keyframes
}
