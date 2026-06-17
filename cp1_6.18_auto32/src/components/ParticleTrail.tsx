import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  OrbitType,
  getOrbitPosition,
  lerpOrbitPosition,
  getColorFromProgress,
  generateStarfieldPositions,
} from '../utils/trajectoryUtils'

interface ParticleTrailProps {
  orbitType: OrbitType
  particleCount: number
}

const TRANSITION_DURATION = 1.5
const MAX_PARTICLES = 1000
const TRAIL_LENGTH = 5

const vertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5);
    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`

export default function ParticleTrail({ orbitType, particleCount }: ParticleTrailProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const starfieldRef = useRef<THREE.Points>(null)

  const prevOrbitRef = useRef<OrbitType>(orbitType)
  const transitionRef = useRef(1.0)
  const timeRef = useRef(0)

  const particleOffsets = useMemo(() => {
    const offsets: { speed: number; lateralX: number; lateralY: number; lateralZ: number; size: number }[] = []
    for (let i = 0; i < MAX_PARTICLES; i++) {
      offsets.push({
        speed: 0.8 + Math.random() * 0.4,
        lateralX: (Math.random() - 0.5) * 0.3,
        lateralY: (Math.random() - 0.5) * 0.3,
        lateralZ: (Math.random() - 0.5) * 0.3,
        size: 0.1 + Math.random() * 0.4,
      })
    }
    return offsets
  }, [])

  const trailPhases = useMemo(() => {
    const phases: number[] = []
    for (let i = 0; i < MAX_PARTICLES; i++) {
      phases.push(Math.random())
    }
    return phases
  }, [])

  const starfieldCount = 800
  const starfieldPositions = useMemo(() => generateStarfieldPositions(starfieldCount), [])
  const starfieldSizes = useMemo(() => {
    const sizes = new Float32Array(starfieldCount)
    for (let i = 0; i < starfieldCount; i++) {
      sizes[i] = 0.3 + Math.random() * 0.7
    }
    return sizes
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_PARTICLES * 3)
    const colors = new Float32Array(MAX_PARTICLES * 3)
    const sizes = new Float32Array(MAX_PARTICLES)
    const alphas = new Float32Array(MAX_PARTICLES)

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))

    geo.setDrawRange(0, particleCount)
    return geo
  }, [])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  const starfieldGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(starfieldPositions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(starfieldSizes, 1))
    return geo
  }, [starfieldPositions, starfieldSizes])

  const starfieldMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vAlpha = aSize;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (60.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(0.8, 0.85, 1.0, vAlpha * glow * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  useEffect(() => {
    if (orbitType !== prevOrbitRef.current) {
      prevOrbitRef.current = orbitType
      transitionRef.current = 0
    }
  }, [orbitType])

  useEffect(() => {
    geometry.setDrawRange(0, particleCount)
  }, [particleCount, geometry])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (transitionRef.current < 1.0) {
      transitionRef.current = Math.min(1.0, transitionRef.current + delta / TRANSITION_DURATION)
    }

    const progress = transitionRef.current
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2

    const fromType = prevOrbitRef.current
    const toType = orbitType
    const isTransitioning = progress < 1.0

    if (!pointsRef.current) return

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = geometry.getAttribute('aSize') as THREE.BufferAttribute
    const alphaAttr = geometry.getAttribute('aAlpha') as THREE.BufferAttribute

    const positions = posAttr.array as Float32Array
    const colors = colAttr.array as Float32Array
    const sizes = sizeAttr.array as Float32Array
    const alphas = alphaAttr.array as Float32Array

    for (let i = 0; i < particleCount; i++) {
      const offset = particleOffsets[i]
      const baseT = trailPhases[i]
      const t = ((baseT + timeRef.current * 0.08 * offset.speed) % 1 + 1) % 1

      let pos: THREE.Vector3
      if (isTransitioning) {
        pos = lerpOrbitPosition(fromType, toType, eased, t, i, particleCount)
      } else {
        pos = getOrbitPosition(toType, t, i, particleCount)
      }

      positions[i * 3] = pos.x + offset.lateralX * Math.sin(timeRef.current * 0.5 + i)
      positions[i * 3 + 1] = pos.y + offset.lateralY * Math.cos(timeRef.current * 0.3 + i)
      positions[i * 3 + 2] = pos.z + offset.lateralZ * Math.sin(timeRef.current * 0.4 + i * 0.7)

      const color = getColorFromProgress(t)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] = offset.size * (0.8 + 0.4 * Math.sin(timeRef.current * 2 + i))
      alphas[i] = 0.5 + 0.5 * Math.sin(t * Math.PI)
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    alphaAttr.needsUpdate = true

    if (starfieldRef.current) {
      const sfPosAttr = starfieldGeo.getAttribute('position') as THREE.BufferAttribute
      const sfPositions = sfPosAttr.array as Float32Array
      for (let i = 0; i < starfieldCount; i++) {
        const twinkle = Math.sin(timeRef.current * (1.5 + (i % 7) * 0.3) + i * 1.7) * 0.002
        sfPositions[i * 3 + 1] += twinkle
      }
      sfPosAttr.needsUpdate = true
    }
  })

  return (
    <>
      <points ref={pointsRef} geometry={geometry} material={material} />
      <points ref={starfieldRef} geometry={starfieldGeo} material={starfieldMat} />
    </>
  )
}
