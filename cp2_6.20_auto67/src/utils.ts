import * as THREE from 'three'

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function generateRandomLifetime(min: number = 3, max: number = 6): number {
  return randomRange(min, max)
}

export function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t)
}

export type ColorGradient = 'orange-yellow' | 'blue-purple' | 'red-green'

export interface ColorStops {
  bottom: THREE.Color
  middle: THREE.Color
  top: THREE.Color
}

export function getColorStops(gradient: ColorGradient): ColorStops {
  switch (gradient) {
    case 'orange-yellow':
      return {
        bottom: new THREE.Color(0xff6600),
        middle: new THREE.Color(0xffcc00),
        top: new THREE.Color(0xcc0000)
      }
    case 'blue-purple':
      return {
        bottom: new THREE.Color(0x0066ff),
        middle: new THREE.Color(0x9933ff),
        top: new THREE.Color(0xff00ff)
      }
    case 'red-green':
      return {
        bottom: new THREE.Color(0xff0000),
        middle: new THREE.Color(0xffff00),
        top: new THREE.Color(0x00ff00)
      }
    default:
      return {
        bottom: new THREE.Color(0xff6600),
        middle: new THREE.Color(0xffcc00),
        top: new THREE.Color(0xcc0000)
      }
  }
}

export function getFlameColor(
  lifeRatio: number,
  gradient: ColorGradient
): THREE.Color {
  const stops = getColorStops(gradient)
  if (lifeRatio < 0.5) {
    return lerpColor(stops.bottom, stops.middle, lifeRatio * 2)
  } else {
    return lerpColor(stops.middle, stops.top, (lifeRatio - 0.5) * 2)
  }
}

export function createCircleTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)')
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function createSimplePointTexture(): THREE.Texture {
  const size = 16
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}
