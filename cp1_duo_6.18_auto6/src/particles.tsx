import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useWeatherStore, ParticleType } from './store'
import { getTerrainHeight } from './terrain'

const MAX_WIND = 5000
const MAX_RAIN = 8000
const MAX_SNOW = 3000
const AREA_HALF = 60
const MAX_PARTICLES_CHANGE = 100

interface ParticleSystemProps {
  type: 'wind' | 'rain' | 'snow'
  activeTypes: ParticleType[]
}

function useParticleOpacity(type: 'wind' | 'rain' | 'snow', activeTypes: ParticleType[]): number {
  const { animationTransition, targetParticleType } = useWeatherStore()

  return useMemo(() => {
    const isInCurrent = activeTypes.includes(type as ParticleType) ||
      (type === 'wind' && activeTypes.includes('wind+rain')) ||
      (type === 'rain' && activeTypes.includes('wind+rain'))

    if (targetParticleType === null) {
      return isInCurrent ? 1 : 0
    }

    const willBeInTarget = targetParticleType === type ||
      (type === 'wind' && targetParticleType === 'wind+rain') ||
      (type === 'rain' && targetParticleType === 'wind+rain')

    const t = animationTransition

    if (isInCurrent && willBeInTarget) return 1
    if (!isInCurrent && !willBeInTarget) return 0
    if (isInCurrent && !willBeInTarget) {
      return t < 0.5 ? 1 - t * 2 : 0
    }
    if (!isInCurrent && willBeInTarget) {
      return t > 0.5 ? (t - 0.5) * 2 : 0
    }
    return 0
  }, [type, activeTypes, animationTransition, targetParticleType])
}

function ParticleSystem({ type, activeTypes }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const lineSegmentsRef = useRef<THREE.LineSegments>(null)
  const { camera } = useThree()
  const density = useWeatherStore((s) => s.density)
  const speed = useWeatherStore((s) => s.speed)
  const windDirection = useWeatherStore((s) => s.windDirection)
  const particleType = useWeatherStore((s) => s.particleType)
  const updateTransition = useWeatherStore((s) => s.updateTransition)

  const opacity = useParticleOpacity(type, activeTypes.includes(particleType) ? [particleType] : [particleType])

  const isWind = type === 'wind'
  const isRain = type === 'rain'
  const isSnow = type === 'snow'

  const MAX_COUNT = isWind ? MAX_WIND : isRain ? MAX_RAIN : MAX_SNOW

  const dataRef = useRef({
    velocities: new Float32Array(MAX_COUNT * 3),
    alive: new Uint8Array(MAX_COUNT),
    lifetimes: new Float32Array(MAX_COUNT),
    desiredAliveCount: 0,
    currentAliveCount: 0,
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_COUNT * 3)
    const sizes = new Float32Array(MAX_COUNT)
    const colors = new Float32Array(MAX_COUNT * 3)

    for (let i = 0; i < MAX_COUNT; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = -1000
      positions[i * 3 + 2] = 0
      sizes[i] = isRain ? 1 : (isWind ? 1.5 : 2)
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geo
  }, [isRain, isWind, isSnow])

  const lineGeometry = useMemo(() => {
    if (!isRain) return null
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_COUNT * 6)
    const colors = new Float32Array(MAX_COUNT * 6)
    for (let i = 0; i < MAX_COUNT; i++) {
      positions[i * 6] = 0
      positions[i * 6 + 1] = -1000
      positions[i * 6 + 2] = 0
      positions[i * 6 + 3] = 0
      positions[i * 6 + 4] = -1000
      positions[i * 6 + 5] = 0
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [isRain])

  function spawnParticle(i: number, positions: Float32Array) {
    const x = (Math.random() - 0.5) * AREA_HALF * 2
    const z = (Math.random() - 0.5) * AREA_HALF * 2
    const terrainH = getTerrainHeight(x, z)

    let y: number
    if (isRain) {
      y = terrainH + 15 + Math.random() * 25
    } else if (isSnow) {
      y = terrainH + 10 + Math.random() * 30
    } else {
      y = terrainH + 0.5 + Math.random() * 12
    }

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    const v = dataRef.current.velocities
    if (isWind) {
      const dir = windDirection + (Math.random() - 0.5) * 0.5
      const windSpeed = 5 + Math.random() * 8
      v[i * 3] = Math.cos(dir) * windSpeed
      v[i * 3 + 1] = (Math.random() - 0.3) * 1.5
      v[i * 3 + 2] = Math.sin(dir) * windSpeed
    } else if (isRain) {
      const dir = windDirection
      v[i * 3] = Math.cos(dir) * 1.5
      v[i * 3 + 1] = -(25 + Math.random() * 20)
      v[i * 3 + 2] = Math.sin(dir) * 1.5
    } else {
      const dir = windDirection + (Math.random() - 0.5) * 1.5
      const windSpeed = 1 + Math.random() * 2
      v[i * 3] = Math.cos(dir) * windSpeed + (Math.random() - 0.5) * 1.5
      v[i * 3 + 1] = -(1 + Math.random() * 2)
      v[i * 3 + 2] = Math.sin(dir) * windSpeed + (Math.random() - 0.5) * 1.5
    }

    dataRef.current.alive[i] = 1
    dataRef.current.lifetimes[i] = 0
  }

  function recycleParticle(i: number, positions: Float32Array) {
    spawnParticle(i, positions)
  }

  useEffect(() => {
    const positions = geometry.attributes.position.array as Float32Array
    const colors = geometry.attributes.color.array as Float32Array
    const sizes = geometry.attributes.size.array as Float32Array

    let color: THREE.Color
    if (isWind) color = new THREE.Color(0xffffff)
    else if (isRain) color = new THREE.Color(0x4da6ff)
    else color = new THREE.Color(0xf0f8ff)

    for (let i = 0; i < MAX_COUNT; i++) {
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
      sizes[i] = isRain ? 1 : (isWind ? 1.2 : 1.8)
    }

    if (isRain && lineGeometry) {
      const lineColors = lineGeometry.attributes.color.array as Float32Array
      const rainColor = new THREE.Color(0x66b3ff)
      for (let i = 0; i < MAX_COUNT; i++) {
        lineColors[i * 6] = rainColor.r
        lineColors[i * 6 + 1] = rainColor.g
        lineColors[i * 6 + 2] = rainColor.b
        lineColors[i * 6 + 3] = rainColor.r
        lineColors[i * 6 + 4] = rainColor.g
        lineColors[i * 6 + 5] = rainColor.b
      }
    }
  }, [geometry, lineGeometry, isWind, isRain, isSnow, MAX_COUNT])

  useFrame((state, delta) => {
    updateTransition(delta)
    if (!pointsRef.current) return

    const positions = geometry.attributes.position.array as Float32Array
    const sizes = geometry.attributes.size.array as Float32Array
    const data = dataRef.current
    const dt = Math.min(delta, 0.05)

    const densityRatio = density / 100
    data.desiredAliveCount = Math.floor(MAX_COUNT * densityRatio * opacity)

    let aliveChange = data.desiredAliveCount - data.currentAliveCount
    if (aliveChange > MAX_PARTICLES_CHANGE) aliveChange = MAX_PARTICLES_CHANGE
    if (aliveChange < -MAX_PARTICLES_CHANGE) aliveChange = -MAX_PARTICLES_CHANGE

    if (aliveChange > 0) {
      let added = 0
      for (let i = 0; i < MAX_COUNT && added < aliveChange; i++) {
        if (!data.alive[i]) {
          spawnParticle(i, positions)
          added++
          data.currentAliveCount++
        }
      }
    } else if (aliveChange < 0) {
      let removed = 0
      for (let i = 0; i < MAX_COUNT && removed < -aliveChange; i++) {
        if (data.alive[i]) {
          data.alive[i] = 0
          positions[i * 3 + 1] = -1000
          removed++
          data.currentAliveCount--
        }
      }
    }

    const v = data.velocities
    let rainLinePositions: Float32Array | null = null
    if (isRain && lineGeometry) {
      rainLinePositions = lineGeometry.attributes.position.array as Float32Array
    }

    const cameraPos = camera.position
    const center = new THREE.Vector3(0, 0, 0)

    for (let i = 0; i < MAX_COUNT; i++) {
      if (!data.alive[i]) continue

      data.lifetimes[i] += dt

      let px = positions[i * 3]
      let py = positions[i * 3 + 1]
      let pz = positions[i * 3 + 2]

      const terrainH = getTerrainHeight(px, pz)

      if (isWind) {
        px += v[i * 3] * dt * speed
        py += v[i * 3 + 1] * dt * speed * 0.5
        pz += v[i * 3 + 2] * dt * speed

        if (py < terrainH + 0.3) {
          py = terrainH + 0.3 + Math.random() * 2
          v[i * 3 + 1] = Math.abs(v[i * 3 + 1]) * 0.5
        }
      } else if (isRain) {
        px += v[i * 3] * dt * speed
        py += v[i * 3 + 1] * dt * speed
        pz += v[i * 3 + 2] * dt * speed
      } else {
        const windOffsetX = Math.sin(data.lifetimes[i] * 2 + i) * 0.5
        const windOffsetZ = Math.cos(data.lifetimes[i] * 1.5 + i * 0.7) * 0.5
        px += (v[i * 3] + windOffsetX) * dt * speed
        py += v[i * 3 + 1] * dt * speed
        pz += (v[i * 3 + 2] + windOffsetZ) * dt * speed
      }

      const boundaryX = AREA_HALF
      const boundaryZ = AREA_HALF

      let needsRecycle = false
      if (px > boundaryX) { px = -boundaryX; needsRecycle = isWind }
      if (px < -boundaryX) { px = boundaryX; needsRecycle = isWind }
      if (pz > boundaryZ) { pz = -boundaryZ; needsRecycle = isWind }
      if (pz < -boundaryZ) { pz = boundaryZ; needsRecycle = isWind }

      if (isRain && py < terrainH) {
        needsRecycle = true
      }
      if (isSnow && py < terrainH + 0.3) {
        needsRecycle = true
      }
      if (isWind && (py > terrainH + 20 || data.lifetimes[i] > 8)) {
        needsRecycle = true
      }

      if (needsRecycle) {
        recycleParticle(i, positions)
        continue
      }

      positions[i * 3] = px
      positions[i * 3 + 1] = py
      positions[i * 3 + 2] = pz

      const dx = px - cameraPos.x
      const dy = py - cameraPos.y
      const dz = pz - cameraPos.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const baseSize = isRain ? 1 : (isWind ? 1.2 : 1.8)
      const sizeFactor = dist < 15 ? 2 : dist > 60 ? 0.5 : 1.3 - (dist - 15) / 75
      sizes[i] = baseSize * sizeFactor

      if (isRain && rainLinePositions) {
        const lineLen = 0.8 * sizeFactor
        rainLinePositions[i * 6] = px
        rainLinePositions[i * 6 + 1] = py + lineLen
        rainLinePositions[i * 6 + 2] = pz
        rainLinePositions[i * 6 + 3] = px
        rainLinePositions[i * 6 + 4] = py - lineLen
        rainLinePositions[i * 6 + 5] = pz
      }
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.size.needsUpdate = true
    if (isRain && lineGeometry) {
      lineGeometry.attributes.position.needsUpdate = true
    }

    const material = pointsRef.current.material as THREE.PointsMaterial
    material.opacity = opacity * (isWind ? 0.5 : isSnow ? 0.85 : 0.7)
  })

  const baseMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: isRain ? 0.15 : (isWind ? 0.25 : 0.4),
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [isRain, isWind, isSnow])

  const rainLineMaterial = useMemo(() => {
    if (!isRain) return null
    return new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1,
    })
  }, [isRain])

  useEffect(() => {
    if (rainLineMaterial) {
      rainLineMaterial.opacity = opacity * 0.7
    }
  }, [opacity, rainLineMaterial])

  return (
    <group>
      <points ref={pointsRef} geometry={geometry} material={baseMaterial} />
      {isRain && lineGeometry && rainLineMaterial && (
        <lineSegments ref={lineSegmentsRef} geometry={lineGeometry} material={rainLineMaterial} />
      )}
    </group>
  )
}

export default function ParticleSystems() {
  const particleType = useWeatherStore((s) => s.particleType)
  const activeTypes = useMemo<ParticleType[]>(() => {
    if (particleType === 'wind+rain') return ['wind', 'rain']
    return [particleType]
  }, [particleType])

  return (
    <group>
      <ParticleSystem type="wind" activeTypes={activeTypes} />
      <ParticleSystem type="rain" activeTypes={activeTypes} />
      <ParticleSystem type="snow" activeTypes={activeTypes} />
    </group>
  )
}
