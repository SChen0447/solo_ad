import { computed, type ComputedRef } from 'vue'
import type { ElementProgress } from './scroll-engine'

export interface TransformMatrix {
  opacity: number
  translateX: number
  translateY: number
  rotate: number
  scale: number
}

export interface StyleObject {
  opacity?: number
  transform?: string
  transition?: string
}

export type AnimationType = 'slideUp' | 'fadeIn' | 'scaleIn' | 'rotateIn' | 'particle' | 'title'

const easingFunctions: Record<string, (t: number) => number> = {
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  linear: (t: number) => t
}

const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

export function useVisualEffects() {
  const getMobileOffset = (): number => {
    if (typeof window === 'undefined') return 50
    return window.innerWidth < 768 ? 25 : 50
  }

  const calculateSlideUpAnimation = (progress: number, isMobile: boolean = false): TransformMatrix => {
    const offset = isMobile ? 25 : 50
    let opacity = 0
    let translateY = offset

    if (progress < 0.3) {
      const t = progress / 0.3
      const eased = easingFunctions.easeOutCubic(t)
      opacity = eased
      translateY = lerp(offset, 0, eased)
    } else if (progress < 0.7) {
      opacity = 1
      translateY = 0
    } else if (progress < 1) {
      const t = (progress - 0.7) / 0.3
      const eased = easingFunctions.easeInOutCubic(t)
      opacity = lerp(1, 0, eased)
      translateY = lerp(0, -30, eased)
    } else {
      opacity = 0
      translateY = -30
    }

    return {
      opacity: clamp(opacity, 0, 1),
      translateX: 0,
      translateY,
      rotate: 0,
      scale: 1
    }
  }

  const calculateFadeInAnimation = (progress: number): TransformMatrix => {
    let opacity = 0

    if (progress < 0.4) {
      const t = progress / 0.4
      opacity = easingFunctions.easeOutCubic(t)
    } else if (progress < 0.7) {
      opacity = 1
    } else if (progress < 1) {
      const t = (progress - 0.7) / 0.3
      opacity = lerp(1, 0, t)
    }

    return {
      opacity: clamp(opacity, 0, 1),
      translateX: 0,
      translateY: 0,
      rotate: 0,
      scale: 1
    }
  }

  const calculateScaleInAnimation = (progress: number): TransformMatrix => {
    let opacity = 0
    let scale = 0.8

    if (progress < 0.4) {
      const t = progress / 0.4
      const eased = easingFunctions.easeOutCubic(t)
      opacity = eased
      scale = lerp(0.8, 1, eased)
    } else if (progress < 0.7) {
      opacity = 1
      scale = 1
    } else if (progress < 1) {
      const t = (progress - 0.7) / 0.3
      opacity = lerp(1, 0, t)
      scale = lerp(1, 0.9, t)
    }

    return {
      opacity: clamp(opacity, 0, 1),
      translateX: 0,
      translateY: 0,
      rotate: 0,
      scale: clamp(scale, 0.1, 1.5)
    }
  }

  const calculateRotateInAnimation = (progress: number): TransformMatrix => {
    let opacity = 0
    let rotate = -15
    let scale = 0.9

    if (progress < 0.4) {
      const t = progress / 0.4
      const eased = easingFunctions.easeOutCubic(t)
      opacity = eased
      rotate = lerp(-15, 0, eased)
      scale = lerp(0.9, 1, eased)
    } else if (progress < 0.7) {
      opacity = 1
      rotate = 0
      scale = 1
    } else if (progress < 1) {
      const t = (progress - 0.7) / 0.3
      opacity = lerp(1, 0, t)
      rotate = lerp(0, 15, t)
    }

    return {
      opacity: clamp(opacity, 0, 1),
      translateX: 0,
      translateY: 0,
      rotate,
      scale: clamp(scale, 0.1, 1.5)
    }
  }

  const calculateParticleAnimation = (progress: number, sceneProgress: number): TransformMatrix => {
    const opacity = lerp(0.1, 0.3, Math.sin(sceneProgress * Math.PI))
    const rotate = sceneProgress * 360
    const baseScale = 1
    const pulseScale = Math.sin(sceneProgress * Math.PI * 2) * 0.1 + 1

    return {
      opacity: clamp(opacity, 0.1, 0.3),
      translateX: 0,
      translateY: 0,
      rotate,
      scale: baseScale * pulseScale
    }
  }

  const calculateTitleAnimation = (progress: number, isMobile: boolean = false): TransformMatrix => {
    const offset = isMobile ? 15 : 30
    let opacity = 0
    let translateY = offset

    if (progress < 0.3) {
      const t = progress / 0.3
      const eased = easingFunctions.easeOutQuart(t)
      opacity = eased
      translateY = lerp(offset, 0, eased)
    } else if (progress < 0.8) {
      opacity = 1
      translateY = 0
    } else {
      const t = (progress - 0.8) / 0.2
      opacity = lerp(1, 0, t)
      translateY = lerp(0, -10, t)
    }

    return {
      opacity: clamp(opacity, 0, 1),
      translateX: 0,
      translateY,
      rotate: 0,
      scale: 1
    }
  }

  const calculateAnimation = (
    type: AnimationType,
    progressData: ElementProgress | undefined
  ): TransformMatrix => {
    if (!progressData) {
      return { opacity: 0, translateX: 0, translateY: 0, rotate: 0, scale: 1 }
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const { progress, sceneProgress } = progressData

    switch (type) {
      case 'slideUp':
        return calculateSlideUpAnimation(progress, isMobile)
      case 'fadeIn':
        return calculateFadeInAnimation(progress)
      case 'scaleIn':
        return calculateScaleInAnimation(progress)
      case 'rotateIn':
        return calculateRotateInAnimation(progress)
      case 'particle':
        return calculateParticleAnimation(progress, sceneProgress)
      case 'title':
        return calculateTitleAnimation(progress, isMobile)
      default:
        return calculateSlideUpAnimation(progress, isMobile)
    }
  }

  const matrixToStyle = (matrix: TransformMatrix, duration: number = 0.4): StyleObject => {
    const style: StyleObject = {}

    if (matrix.opacity !== undefined) {
      style.opacity = matrix.opacity
    }

    const transforms: string[] = []
    if (matrix.translateX !== 0) {
      transforms.push(`translateX(${matrix.translateX}px)`)
    }
    if (matrix.translateY !== 0) {
      transforms.push(`translateY(${matrix.translateY}px)`)
    }
    if (matrix.rotate !== 0) {
      transforms.push(`rotate(${matrix.rotate}deg)`)
    }
    if (matrix.scale !== 1) {
      transforms.push(`scale(${matrix.scale})`)
    }

    if (transforms.length > 0) {
      style.transform = transforms.join(' ')
    }

    return style
  }

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 }
  }

  const interpolateColor = (color1: string, color2: string, t: number): string => {
    const rgb1 = hexToRgb(color1)
    const rgb2 = hexToRgb(color2)

    const r = Math.round(lerp(rgb1.r, rgb2.r, t))
    const g = Math.round(lerp(rgb1.g, rgb2.g, t))
    const b = Math.round(lerp(rgb1.b, rgb2.b, t))

    return `rgb(${r}, ${g}, ${b})`
  }

  const getBackgroundGradient = (
    colorStart: string,
    colorEnd: string,
    progress: number
  ): string => {
    const eased = easingFunctions.easeInOutCubic(progress)
    const topColor = interpolateColor(colorStart, colorEnd, eased)
    const bottomColor = interpolateColor(colorEnd, colorStart, eased * 0.5)
    return `linear-gradient(180deg, ${topColor} 0%, ${bottomColor} 100%)`
  }

  const useAnimatedStyle = (
    progressRef: ComputedRef<ElementProgress | undefined>,
    type: AnimationType
  ): ComputedRef<StyleObject> => {
    return computed(() => {
      const matrix = calculateAnimation(type, progressRef.value)
      return matrixToStyle(matrix)
    })
  }

  return {
    calculateAnimation,
    matrixToStyle,
    interpolateColor,
    getBackgroundGradient,
    useAnimatedStyle,
    calculateSlideUpAnimation,
    calculateFadeInAnimation,
    calculateScaleInAnimation,
    calculateRotateInAnimation,
    calculateParticleAnimation,
    calculateTitleAnimation,
    getMobileOffset
  }
}
