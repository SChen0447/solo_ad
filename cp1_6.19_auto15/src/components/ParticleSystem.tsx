import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAuroraStore } from '../stores/auroraStore'

const PARTICLE_COUNT = 500
const SPACE_WIDTH = 30
const SPACE_HEIGHT = 20
const SPACE_DEPTH = 10
const TRANSITION_SPEED = 2

const hexToRgb = (hex: string): THREE.Color => new THREE.Color(hex)

const createCircleTexture = (): THREE.Texture => {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  )
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.4)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

interface ParticleData {
  baseY: number
  phase: number
  amplitude: number
  basePeriod: number
  size: number
  colorMix: number
  driftSpeed: number
  driftPhase: number
}

export function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null)
  const particleData = useRef<ParticleData[]>([])
  const currentStartColor = useRef(new THREE.Color('#00d4ff'))
  const currentEndColor = useRef(new THREE.Color('#a855f7'))
  const targetStartColor = useRef(new THREE.Color('#00d4ff'))
  const targetEndColor = useRef(new THREE.Color('#a855f7'))

  const texture = useMemo(() => createCircleTexture(), [])

  const { positions, sizes, colors, colorMixes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const siz = new Float32Array(PARTICLE_COUNT)
    const col = new Float32Array(PARTICLE_COUNT * 3)
    const mix = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * SPACE_WIDTH
      const y = (Math.random() - 0.5) * SPACE_HEIGHT
      const z = (Math.random() - 0.5) * SPACE_DEPTH
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z

      particleData.current[i] = {
        baseY: y,
        phase: Math.random() * Math.PI * 2,
        amplitude: 1 + Math.random() * 2,
        basePeriod: 4 + Math.random() * 4,
        size: 2 + Math.random() * 4,
        colorMix: Math.random(),
        driftSpeed: 0.05 + Math.random() * 0.1,
        driftPhase: Math.random() * Math.PI * 2,
      }

      siz[i] = particleData.current[i].size
      mix[i] = particleData.current[i].colorMix

      const startColor = new THREE.Color('#00d4ff')
      const endColor = new THREE.Color('#a855f7')
      const particleColor = new THREE.Color().lerpColors(
        startColor,
        endColor,
        particleData.current[i].colorMix
      )
      col[i * 3] = particleColor.r
      col[i * 3 + 1] = particleColor.g
      col[i * 3 + 2] = particleColor.b
    }

    return { positions: pos, sizes: siz, colors: col, colorMixes: mix }
  }, [])

  useEffect(() => {
    const store = useAuroraStore.getState()
    targetStartColor.current = hexToRgb(store.getPrimaryColor())
    targetEndColor.current = hexToRgb(store.getSecondaryColor())
    currentStartColor.current.copy(targetStartColor.current)
    currentEndColor.current.copy(targetEndColor.current)
  }, [])

  useFrame(({ clock }) => {
    if (!pointsRef.current) return

    const store = useAuroraStore.getState()
    const targetStart = hexToRgb(store.getPrimaryColor())
    const targetEnd = hexToRgb(store.getSecondaryColor())
    const frequency = store.getWaveFrequency()
    const amplitude = store.getWaveAmplitude()

    targetStartColor.current.copy(targetStart)
    targetEndColor.current.copy(targetEnd)

    const delta = clock.getDelta()
    currentStartColor.current.lerp(targetStartColor.current, delta * TRANSITION_SPEED)
    currentEndColor.current.lerp(targetEndColor.current, delta * TRANSITION_SPEED)

    const elapsed = clock.getElapsedTime()
    const geometry = pointsRef.current.geometry
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const colAttr = geometry.attributes.color as THREE.BufferAttribute
    const sizeAttr = geometry.attributes.size as THREE.BufferAttribute

    const posArr = posAttr.array as Float32Array
    const colArr = colAttr.array as Float32Array
    const sizeArr = sizeAttr.array as Float32Array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const data = particleData.current[i]
      if (!data) continue

      const period = data.basePeriod / (0.3 + frequency * 0.9)
      const amp = data.amplitude * (0.4 + amplitude * 0.5)
      const waveY = Math.sin(elapsed / period + data.phase) * amp
      const driftY = Math.sin(elapsed * data.driftSpeed + data.driftPhase) * 0.5
      posArr[i * 3 + 1] = data.baseY + waveY + driftY

      const mix = colorMixes[i]
      const r = currentStartColor.current.r * (1 - mix) + currentEndColor.current.r * mix
      const g = currentStartColor.current.g * (1 - mix) + currentEndColor.current.g * mix
      const b = currentStartColor.current.b * (1 - mix) + currentEndColor.current.b * mix
      colArr[i * 3] = r
      colArr[i * 3 + 1] = g
      colArr[i * 3 + 2] = b

      const brightness = 0.85 + Math.sin(elapsed / (period * 0.6) + data.phase) * 0.15
      sizeArr[i] = sizes[i] * brightness
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={PARTICLE_COUNT}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={PARTICLE_COUNT}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
          count={PARTICLE_COUNT}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.92}
        map={texture}
        alphaTest={0.01}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}
