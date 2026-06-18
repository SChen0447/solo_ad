export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

export const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t)

export const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export const lerp = (start: number, end: number, t: number): number => start + (end - start) * t

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

export const lerpColor = (colorA: string, colorB: string, t: number): string => {
  const hex = (c: string) => {
    const r = parseInt(c.slice(1, 3), 16)
    const g = parseInt(c.slice(3, 5), 16)
    const b = parseInt(c.slice(5, 7), 16)
    return { r, g, b }
  }
  const a = hex(colorA)
  const b = hex(colorB)
  const r = Math.round(lerp(a.r, b.r, t))
  const g = Math.round(lerp(a.g, b.g, t))
  const bl = Math.round(lerp(a.b, b.b, t))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl
    .toString(16)
    .padStart(2, '0')}`
}

export const animateWithDuration = (
  duration: number,
  onUpdate: (progress: number) => void,
  onComplete?: () => void
): (() => void) => {
  let frameId: number
  const startTime = performance.now()

  const tick = () => {
    const elapsed = performance.now() - startTime
    const progress = clamp(elapsed / duration, 0, 1)
    onUpdate(progress)
    if (progress < 1) {
      frameId = requestAnimationFrame(tick)
    } else {
      onComplete?.()
    }
  }

  frameId = requestAnimationFrame(tick)

  return () => cancelAnimationFrame(frameId)
}
