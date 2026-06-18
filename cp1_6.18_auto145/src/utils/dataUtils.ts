import * as THREE from 'three'

const GRID_SIZE = 25
const GRID_HALF = (GRID_SIZE - 1) / 2
const SPATIAL_EXTENT = 10

export function gridToWorld(i: number, j: number, k: number): [number, number, number] {
  return [
    (i - GRID_HALF) * (SPATIAL_EXTENT / GRID_HALF),
    (j - GRID_HALF) * (SPATIAL_EXTENT / GRID_HALF),
    (k - GRID_HALF) * (SPATIAL_EXTENT / GRID_HALF),
  ]
}

export function worldToGrid(x: number, y: number, z: number): [number, number, number] {
  return [
    Math.round((x / (SPATIAL_EXTENT / GRID_HALF)) + GRID_HALF),
    Math.round((y / (SPATIAL_EXTENT / GRID_HALF)) + GRID_HALF),
    Math.round((z / (SPATIAL_EXTENT / GRID_HALF)) + GRID_HALF),
  ]
}

export interface ColorStop {
  t: number
  color: THREE.Color
}

export function interpolateColor(
  value: number,
  min: number,
  max: number,
  stops: ColorStop[]
): THREE.Color {
  const t = max === min ? 0.5 : (value - min) / (max - min)
  const clamped = Math.max(0, Math.min(1, t))

  let lower = stops[0]
  let upper = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].t && clamped <= stops[i + 1].t) {
      lower = stops[i]
      upper = stops[i + 1]
      break
    }
  }

  const range = upper.t - lower.t
  const localT = range === 0 ? 0 : (clamped - lower.t) / range
  return new THREE.Color().lerpColors(lower.color, upper.color, localT)
}

const WAVE_CREST = new THREE.Color(0xffdd00)
const WAVE_TROUGH = new THREE.Color(0x4a0080)

export function waveAmplitudeColor(amplitude: number, maxAmp: number): THREE.Color {
  const t = maxAmp === 0 ? 0.5 : (amplitude / maxAmp + 1) * 0.5
  return new THREE.Color().lerpColors(WAVE_TROUGH, WAVE_CREST, Math.max(0, Math.min(1, t)))
}

const INTERFERENCE_STRONG = new THREE.Color(0xff2020)
const INTERFERENCE_NODE = new THREE.Color(0x88ccff)

export function interferenceColor(amplitude: number, maxAmp: number): { color: THREE.Color; opacity: number } {
  const t = maxAmp === 0 ? 0 : Math.abs(amplitude) / maxAmp
  const clamped = Math.max(0, Math.min(1, t))
  if (clamped < 0.05) {
    return { color: INTERFERENCE_NODE.clone(), opacity: 0.15 }
  }
  return {
    color: new THREE.Color().lerpColors(INTERFERENCE_NODE, INTERFERENCE_STRONG, clamped),
    opacity: 0.2 + clamped * 0.7,
  }
}

const ENERGY_LOW = new THREE.Color(0x0044ff)
const ENERGY_HIGH = new THREE.Color(0xff0000)

export function energyColor(energy: number, maxEnergy: number): THREE.Color {
  const t = maxEnergy === 0 ? 0 : energy / maxEnergy
  return new THREE.Color().lerpColors(ENERGY_LOW, ENERGY_HIGH, Math.max(0, Math.min(1, t)))
}

export function amplitudeToEnergy(amplitude: number): number {
  return amplitude * amplitude
}

export function getGridSize(): number {
  return GRID_SIZE
}

export function getSpatialExtent(): number {
  return SPATIAL_EXTENT
}

export function getGridHalf(): number {
  return GRID_HALF
}
