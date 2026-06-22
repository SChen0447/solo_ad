import type { KeyframeProperties } from '../timeline/keyframe'
import { Keyframe } from '../timeline/keyframe'

export type ElementType = 'rectangle' | 'circle' | 'text'

export interface ElementStyle {
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  borderRadius?: number
  text?: string
  fontSize?: number
  fontFamily?: string
}

export interface InitialState {
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
}

export class CanvasElement {
  id: string
  name: string
  type: ElementType
  initialState: InitialState
  style: ElementStyle
  keyframes: Keyframe[]
  visible: boolean

  constructor(
    id: string,
    name: string,
    type: ElementType,
    initialState: InitialState,
    style: ElementStyle
  ) {
    this.id = id
    this.name = name
    this.type = type
    this.initialState = { ...initialState }
    this.style = { ...style }
    this.keyframes = []
    this.visible = true
  }

  addKeyframe(keyframe: Keyframe): void {
    const existingIndex = this.keyframes.findIndex(k => k.frame === keyframe.frame)
    if (existingIndex >= 0) {
      this.keyframes[existingIndex] = keyframe
    } else {
      this.keyframes.push(keyframe)
      this.keyframes.sort((a, b) => a.frame - b.frame)
    }
  }

  removeKeyframe(frame: number): boolean {
    const index = this.keyframes.findIndex(k => k.frame === frame)
    if (index >= 0) {
      this.keyframes.splice(index, 1)
      return true
    }
    return false
  }

  getKeyframeAtFrame(frame: number): Keyframe | undefined {
    return this.keyframes.find(k => k.frame === frame)
  }

  getInterpolatedProperties(frame: number): KeyframeProperties {
    const result: KeyframeProperties = {
      x: this.initialState.x,
      y: this.initialState.y,
      rotation: this.initialState.rotation,
      scale: this.initialState.scale,
      opacity: this.initialState.opacity
    }

    if (this.keyframes.length === 0) {
      return result
    }

    const sortedKeyframes = [...this.keyframes].sort((a, b) => a.frame - b.frame)

    if (frame <= sortedKeyframes[0].frame) {
      const kf = sortedKeyframes[0]
      if (kf.properties.x !== undefined) result.x = kf.properties.x
      if (kf.properties.y !== undefined) result.y = kf.properties.y
      if (kf.properties.rotation !== undefined) result.rotation = kf.properties.rotation
      if (kf.properties.scale !== undefined) result.scale = kf.properties.scale
      if (kf.properties.opacity !== undefined) result.opacity = kf.properties.opacity
      return result
    }

    if (frame >= sortedKeyframes[sortedKeyframes.length - 1].frame) {
      const kf = sortedKeyframes[sortedKeyframes.length - 1]
      if (kf.properties.x !== undefined) result.x = kf.properties.x
      if (kf.properties.y !== undefined) result.y = kf.properties.y
      if (kf.properties.rotation !== undefined) result.rotation = kf.properties.rotation
      if (kf.properties.scale !== undefined) result.scale = kf.properties.scale
      if (kf.properties.opacity !== undefined) result.opacity = kf.properties.opacity
      return result
    }

    let startKf: Keyframe | null = null
    let endKf: Keyframe | null = null

    for (let i = 0; i < sortedKeyframes.length - 1; i++) {
      if (frame >= sortedKeyframes[i].frame && frame <= sortedKeyframes[i + 1].frame) {
        startKf = sortedKeyframes[i]
        endKf = sortedKeyframes[i + 1]
        break
      }
    }

    if (startKf && endKf) {
      const frameSpan = endKf.frame - startKf.frame
      const t = frameSpan > 0 ? (frame - startKf.frame) / frameSpan : 0

      const props: (keyof KeyframeProperties)[] = ['x', 'y', 'rotation', 'scale', 'opacity']

      for (const prop of props) {
        const startVal = startKf.properties[prop] ?? this.initialState[prop]
        const endVal = endKf.properties[prop] ?? this.initialState[prop]
        const easedValue = this.easeValue(startVal, endVal, t, endKf.easing)
        ;(result as Record<string, number>)[prop] = easedValue
      }
    }

    return result
  }

  private easeValue(start: number, end: number, t: number, easing: string): number {
    let easedT = t
    switch (easing) {
      case 'linear':
        easedT = t
        break
      case 'easeIn':
      case 'easeInQuad':
        easedT = t * t
        break
      case 'easeOut':
      case 'easeOutQuad':
        easedT = 1 - (1 - t) * (1 - t)
        break
      case 'easeInOut':
      case 'easeInOutQuad':
        easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        break
      case 'easeInCubic':
        easedT = t * t * t
        break
      case 'easeOutCubic':
        easedT = 1 - Math.pow(1 - t, 3)
        break
      case 'easeInOutCubic':
        easedT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        break
      default:
        easedT = t
    }
    return start + (end - start) * easedT
  }

  clone(): CanvasElement {
    const clone = new CanvasElement(this.id, this.name, this.type, this.initialState, this.style)
    clone.keyframes = this.keyframes.map(k => k.clone())
    clone.visible = this.visible
    return clone
  }
}
