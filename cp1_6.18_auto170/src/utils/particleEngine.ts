import * as THREE from 'three'
import { scaleLinear } from 'd3-scale'
import type { EmotionDimensions } from '../store/emotionStore'

export interface ParticleData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  velocities: Float32Array
  orbitRadii: Float32Array
  orbitSpeeds: Float32Array
  orbitOffsets: Float32Array
  trailPositions: Float32Array[]
  trailAlphas: Float32Array[]
}

export function createParticleData(count: number): ParticleData {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const velocities = new Float32Array(count * 3)
  const orbitRadii = new Float32Array(count)
  const orbitSpeeds = new Float32Array(count)
  const orbitOffsets = new Float32Array(count)
  
  const trailLength = 30
  const trailPositions: Float32Array[] = []
  const trailAlphas: Float32Array[] = []
  
  for (let i = 0; i < count; i++) {
    trailPositions.push(new Float32Array(trailLength * 3))
    trailAlphas.push(new Float32Array(trailLength))
  }

  return {
    positions,
    colors,
    sizes,
    velocities,
    orbitRadii,
    orbitSpeeds,
    orbitOffsets,
    trailPositions,
    trailAlphas
  }
}

export function updateParticleData(
  data: ParticleData,
  emotions: EmotionDimensions,
  baseColor: { r: number; g: number; b: number; a: number },
  time: number,
  speedMultiplier: number,
  deltaTime: number
): void {
  const { joy, sadness, anger, calm, anxiety } = emotions
  const count = data.positions.length / 3

  const joyColor = new THREE.Color(0xffd700)
  const sadnessColor = new THREE.Color(0x4a0080)
  const angerColor = new THREE.Color(0xff4500)
  const calmColor = new THREE.Color(0x00ced1)
  const anxietyColor = new THREE.Color(0x9400d3)
  
  const baseTColor = new THREE.Color(
    baseColor.r / 255,
    baseColor.g / 255,
    baseColor.b / 255
  )

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    
    const seed = i / count
    const angleOffset = data.orbitOffsets[i] || Math.random() * Math.PI * 2
    data.orbitOffsets[i] = angleOffset
    
    const baseRadius = 2 + seed * 3
    const radiusVariation = joy * 2 + anxiety * 1.5 - calm * 1
    const orbitRadius = baseRadius + radiusVariation * (Math.sin(seed * 10) * 0.5 + 0.5)
    data.orbitRadii[i] = orbitRadius
    
    const baseSpeed = 0.3
    const speedVariation = joy * 2 + anger * 1.5 - sadness * 0.8 - calm * 0.5
    const orbitSpeed = baseSpeed + speedVariation * (0.5 + Math.random() * 0.5)
    data.orbitSpeeds[i] = orbitSpeed
    
    const yOffset = (seed - 0.5) * 3 * (1 + anxiety * 0.5 - calm * 0.3)
    const yWave = Math.sin(time * 0.5 + seed * 5) * (0.3 + anxiety * 0.5)
    
    const angle = time * orbitSpeed * speedMultiplier * 0.2 + angleOffset
    
    let x = Math.cos(angle) * orbitRadius
    let y = yOffset + yWave
    let z = Math.sin(angle) * orbitRadius
    
    const expansionSpeed = sadness * 0.3 + anxiety * 0.2
    const expansionRadius = orbitRadius * (1 + Math.sin(time * 0.2 + seed * 7) * expansionSpeed * 0.3)
    
    x = Math.cos(angle) * expansionRadius
    z = Math.sin(angle) * expansionRadius
    
    const chaosAmount = anxiety * 0.5 + anger * 0.3
    x += Math.sin(time * 2 + seed * 13) * chaosAmount
    y += Math.cos(time * 1.5 + seed * 17) * chaosAmount * 0.7
    z += Math.sin(time * 1.8 + seed * 19) * chaosAmount
    
    const oldX = data.positions[i3] || x
    const oldY = data.positions[i3 + 1] || y
    const oldZ = data.positions[i3 + 2] || z
    
    const smoothFactor = 0.1 + calm * 0.3
    data.positions[i3] = oldX + (x - oldX) * smoothFactor
    data.positions[i3 + 1] = oldY + (y - oldY) * smoothFactor
    data.positions[i3 + 2] = oldZ + (z - oldZ) * smoothFactor
    
    const finalColor = new THREE.Color()
    finalColor.copy(baseTColor)
    finalColor.lerp(joyColor, joy * 0.6)
    finalColor.lerp(sadnessColor, sadness * 0.4)
    finalColor.lerp(angerColor, anger * 0.3)
    finalColor.lerp(calmColor, calm * 0.3)
    finalColor.lerp(anxietyColor, anxiety * 0.2)
    
    const brightness = 0.7 + joy * 0.3 - sadness * 0.2
    finalColor.multiplyScalar(brightness)
    
    data.colors[i3] = finalColor.r
    data.colors[i3 + 1] = finalColor.g
    data.colors[i3 + 2] = finalColor.b
    
    const baseSize = 0.03
    const sizeVariation = joy * 0.04 + anger * 0.03 - sadness * 0.02
    const size = baseSize + sizeVariation * (0.5 + Math.random() * 0.5)
    data.sizes[i] = size
    
    updateTrail(i, data, deltaTime)
  }
}

function updateTrail(index: number, data: ParticleData, deltaTime: number): void {
  const trailPositions = data.trailPositions[index]
  const trailAlphas = data.trailAlphas[index]
  const trailLength = trailPositions.length / 3
  
  const i3 = index * 3
  const currentX = data.positions[i3]
  const currentY = data.positions[i3 + 1]
  const currentZ = data.positions[i3 + 2]
  
  for (let i = trailLength - 1; i > 0; i--) {
    trailPositions[i * 3] = trailPositions[(i - 1) * 3]
    trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1]
    trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2]
    trailAlphas[i] = trailAlphas[i - 1] * 0.95
  }
  
  trailPositions[0] = currentX
  trailPositions[1] = currentY
  trailPositions[2] = currentZ
  trailAlphas[0] = 1
}

export function getEmotionColorScale(emotion: keyof EmotionDimensions): (t: number) => string {
  const colorMap: Record<keyof EmotionDimensions, [string, string]> = {
    joy: ['#666600', '#ffd700'],
    sadness: ['#1a0033', '#4a0080'],
    anger: ['#331100', '#ff4500'],
    calm: ['#003333', '#00ced1'],
    anxiety: ['#2e0854', '#9400d3']
  }
  
  const [low, high] = colorMap[emotion]
  const scale = scaleLinear<string>()
    .domain([0, 1])
    .range([low, high])
  return (t: number) => scale(t)
}
