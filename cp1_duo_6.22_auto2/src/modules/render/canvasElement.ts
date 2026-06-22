import type { KeyframeProperties, PropertyValueDict } from '../timeline/keyframe'
import { Keyframe, interpolateProperty, PROPERTY_KEYS, mergeProperties } from '../timeline/keyframe'
import type { EasingType } from '../timeline/keyframe'

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

export interface InitialState extends KeyframeProperties {}

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
      return mergeProperties(result, kf.properties)
    }

    if (frame >= sortedKeyframes[sortedKeyframes.length - 1].frame) {
      const kf = sortedKeyframes[sortedKeyframes.length - 1]
      return mergeProperties(result, kf.properties)
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

      for (const prop of PROPERTY_KEYS) {
        const startVal = startKf.properties[prop] ?? this.initialState[prop]
        const endVal = endKf.properties[prop] ?? this.initialState[prop]
        ;(result as Record<string, number>)[prop] = interpolateProperty(
          startVal,
          endVal,
          t,
          endKf.easing as EasingType,
          endKf.customEasingFn ?? undefined
        )
      }
    }

    return result
  }

  getPropertyValueDict(frame: number): PropertyValueDict {
    return this.getInterpolatedProperties(frame)
  }

  clone(): CanvasElement {
    const clone = new CanvasElement(this.id, this.name, this.type, this.initialState, this.style)
    clone.keyframes = this.keyframes.map(k => k.clone())
    clone.visible = this.visible
    return clone
  }
}
