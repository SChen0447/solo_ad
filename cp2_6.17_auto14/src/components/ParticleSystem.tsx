import { useRef, useMemo, useCallback } from 'react'
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore, EMOTION_CONFIGS } from '@/store/useStore'

const MAX_PARTICLES = 3000
const MAX_BURST = 200
const EMOTION_TRANSITION_MS = 1500

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = h / 360
  const sn = s / 100
  const ln = l / 100
  if (sn === 0) return [ln, ln, ln]
  const hue2rgb = (p: number, q: number, t: number) => {
    let tn = t
    if (tn < 0) tn += 1
    if (tn > 1) tn -= 1
    if (tn < 1 / 6) return p + (q - p) * 6 * tn
    if (tn < 1 / 2) return q
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6
    return p
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q
  return [hue2rgb(p, q, hn + 1 / 3), hue2rgb(p, q, hn), hue2rgb(p, q, hn - 1 / 3)]
}

function lerpHue(a: number, b: number, t: number): number {
  let diff = b - a
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  let result = a + diff * t
  if (result < 0) result += 360
  if (result >= 360) result -= 360
  return result
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uPixelRatio;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = (1.0 - smoothstep(0.15, 0.5, dist)) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`

interface ParticleDatum {
  baseX: number
  baseY: number
  baseZ: number
  freqX: number
  freqY: number
  freqZ: number
  phaseX: number
  phaseY: number
  phaseZ: number
  sizeFactor: number
  colorOffset: number
}

interface BurstDatum {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  maxLife: number
}

interface HighlightState {
  index: number
  startTime: number
  flyDirX: number
  flyDirY: number
  flyDirZ: number
  phase: 'highlight' | 'flyout' | 'done'
  burstSpawned: boolean
}

export default function ParticleSystem() {
  const emotionMode = useStore((s) => s.emotionMode)
  const particleCount = useStore((s) => s.particleCount)
  const particleSize = useStore((s) => s.particleSize)
  const motionSpeed = useStore((s) => s.motionSpeed)

  const pointsRef = useRef<THREE.Points>(null)
  const burstRef = useRef<THREE.Points>(null)
  const { gl } = useThree()

  const particleData = useRef<ParticleDatum[]>([])
  const currentHSL = useRef<[number, number, number]>([48, 100, 62])
  const targetHSL = useRef<[number, number, number]>([48, 100, 62])
  const transitionStartHSL = useRef<[number, number, number]>([48, 100, 62])
  const transitionProgress = useRef(1)

  const highlightState = useRef<HighlightState | null>(null)
  const burstData = useRef<BurstDatum[]>([])
  const burstCount = useRef(0)

  const prevParticleCount = useRef(particleCount)
  const prevParticleSize = useRef(particleSize)
  const sizeTransition = useRef(1)

  useMemo(() => {
    const data: ParticleDatum[] = []
    for (let i = 0; i < MAX_PARTICLES; i++) {
      data.push({
        baseX: (Math.random() - 0.5) * 30,
        baseY: (Math.random() - 0.5) * 30,
        baseZ: (Math.random() - 0.5) * 30,
        freqX: 0.3 + Math.random() * 0.7,
        freqY: 0.2 + Math.random() * 0.6,
        freqZ: 0.4 + Math.random() * 0.5,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2,
        sizeFactor: 0.6 + Math.random() * 0.4,
        colorOffset: Math.random() * 0.2 - 0.1,
      })
    }
    particleData.current = data
  }, [])

  const positions = useMemo(() => new Float32Array(MAX_PARTICLES * 3), [])
  const colors = useMemo(() => new Float32Array(MAX_PARTICLES * 3), [])
  const sizes = useMemo(() => new Float32Array(MAX_PARTICLES), [])
  const alphas = useMemo(() => new Float32Array(MAX_PARTICLES).fill(1), [])

  const burstPositions = useMemo(() => new Float32Array(MAX_BURST * 3), [])
  const burstColors = useMemo(() => new Float32Array(MAX_BURST * 3), [])
  const burstSizes = useMemo(() => new Float32Array(MAX_BURST), [])
  const burstAlphas = useMemo(() => new Float32Array(MAX_BURST), [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
    geo.setDrawRange(0, particleCount)
    return geo
  }, [])

  const burstGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(burstColors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(burstSizes, 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(burstAlphas, 1))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        },
      }),
    []
  )

  const burstMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        },
      }),
    []
  )

  useMemo(() => {
    const config = EMOTION_CONFIGS[emotionMode]
    transitionStartHSL.current = [...currentHSL.current] as [number, number, number]
    targetHSL.current = [...config.color] as [number, number, number]
    transitionProgress.current = 0
  }, [emotionMode])

  useMemo(() => {
    if (particleCount !== prevParticleCount.current) {
      geometry.setDrawRange(0, particleCount)
      prevParticleCount.current = particleCount
    }
  }, [particleCount, geometry])

  useMemo(() => {
    if (particleSize !== prevParticleSize.current) {
      sizeTransition.current = 0
      prevParticleSize.current = particleSize
    }
  }, [particleSize])

  const spawnBurst = useCallback((x: number, y: number, z: number) => {
    for (let i = 0; i < 5; i++) {
      if (burstCount.current >= MAX_BURST) break
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 3 + Math.random() * 5
      burstData.current.push({
        x,
        y,
        z,
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.sin(phi) * Math.sin(theta) * speed,
        vz: Math.cos(phi) * speed,
        life: 0,
        maxLife: 1.5 + Math.random() * 0.5,
      })
      burstCount.current = burstData.current.length
    }
  }, [])

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      if (highlightState.current && highlightState.current.phase !== 'done') return
      if (!pointsRef.current) return

      const pointIndex = event.index
      if (pointIndex === undefined || pointIndex < 0 || pointIndex >= particleCount) return

      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize()

      highlightState.current = {
        index: pointIndex,
        startTime: performance.now() / 1000,
        flyDirX: dir.x * 15,
        flyDirY: dir.y * 15,
        flyDirZ: dir.z * 15,
        phase: 'highlight',
        burstSpawned: false,
      }
    },
    [particleCount]
  )

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const delta = Math.min(state.clock.getDelta(), 0.05)
    const config = EMOTION_CONFIGS[emotionMode]

    if (transitionProgress.current < 1) {
      transitionProgress.current = Math.min(
        1,
        transitionProgress.current + delta / (EMOTION_TRANSITION_MS / 1000)
      )
      const t = easeOutCubic(transitionProgress.current)
      currentHSL.current = [
        lerpHue(transitionStartHSL.current[0], targetHSL.current[0], t),
        lerp(transitionStartHSL.current[1], targetHSL.current[1], t),
        lerp(transitionStartHSL.current[2], targetHSL.current[2], t),
      ]
    }

    if (sizeTransition.current < 1) {
      sizeTransition.current = Math.min(1, sizeTransition.current + delta / 0.5)
    }

    const speed = motionSpeed * config.speedMultiplier
    const amplitude = config.amplitudeMultiplier
    const [r, g, b] = hslToRgb(...currentHSL.current)

    const hl = highlightState.current
    const hlActive = hl && hl.phase !== 'done'
    const hlIndex = hlActive ? hl!.index : -1

    for (let i = 0; i < particleCount; i++) {
      const d = particleData.current[i]
      const i3 = i * 3

      if (i === hlIndex) {
        const hlState = hl!
        const elapsed = time - hlState.startTime

        if (hlState.phase === 'highlight') {
          if (elapsed < 0.3) {
            const t = elapsed / 0.3
            positions[i3] = d.baseX + Math.sin(time * d.freqX * speed + d.phaseX) * amplitude
            positions[i3 + 1] = d.baseY + Math.sin(time * d.freqY * speed + d.phaseY) * amplitude
            positions[i3 + 2] = d.baseZ + Math.sin(time * d.freqZ * speed + d.phaseZ) * amplitude
            sizes[i] = particleSize * d.sizeFactor * (1 + t * 2)
            colors[i3] = lerp(r + d.colorOffset, 1, t)
            colors[i3 + 1] = lerp(g + d.colorOffset * 0.5, 1, t)
            colors[i3 + 2] = lerp(b + d.colorOffset * 0.3, 1, t)
            alphas[i] = 1
          } else {
            hlState.phase = 'flyout'
            hlState.startTime = time
            if (!hlState.burstSpawned) {
              spawnBurst(positions[i3], positions[i3 + 1], positions[i3 + 2])
              hlState.burstSpawned = true
            }
          }
        }

        if (hlState.phase === 'flyout') {
          const flyElapsed = time - hlState.startTime
          if (flyElapsed < 2) {
            const t = flyElapsed / 2
            const basePosX = d.baseX + Math.sin(hlState.startTime * d.freqX * speed + d.phaseX) * amplitude
            const basePosY = d.baseY + Math.sin(hlState.startTime * d.freqY * speed + d.phaseY) * amplitude
            const basePosZ = d.baseZ + Math.sin(hlState.startTime * d.freqZ * speed + d.phaseZ) * amplitude
            positions[i3] = basePosX + hlState.flyDirX * t
            positions[i3 + 1] = basePosY + hlState.flyDirY * t
            positions[i3 + 2] = basePosZ + hlState.flyDirZ * t
            sizes[i] = particleSize * d.sizeFactor * 3 * (1 - t)
            colors[i3] = 1
            colors[i3 + 1] = 1
            colors[i3 + 2] = 1
            alphas[i] = 1 - t
          } else {
            hlState.phase = 'done'
            d.baseX = (Math.random() - 0.5) * 30
            d.baseY = (Math.random() - 0.5) * 30
            d.baseZ = (Math.random() - 0.5) * 30
          }
        }
        continue
      }

      positions[i3] = d.baseX + Math.sin(time * d.freqX * speed + d.phaseX) * amplitude
      positions[i3 + 1] = d.baseY + Math.sin(time * d.freqY * speed + d.phaseY) * amplitude
      positions[i3 + 2] = d.baseZ + Math.sin(time * d.freqZ * speed + d.phaseZ) * amplitude

      const co = d.colorOffset
      colors[i3] = Math.min(1, Math.max(0, r + co))
      colors[i3 + 1] = Math.min(1, Math.max(0, g + co * 0.5))
      colors[i3 + 2] = Math.min(1, Math.max(0, b + co * 0.3))

      sizes[i] = particleSize * d.sizeFactor
      alphas[i] = 1.0
    }

    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const colAttr = geometry.attributes.aColor as THREE.BufferAttribute
    const sizeAttr = geometry.attributes.aSize as THREE.BufferAttribute
    const alphaAttr = geometry.attributes.aAlpha as THREE.BufferAttribute
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    alphaAttr.needsUpdate = true

    const bPosAttr = burstGeometry.attributes.position as THREE.BufferAttribute
    const bColAttr = burstGeometry.attributes.aColor as THREE.BufferAttribute
    const bSizeAttr = burstGeometry.attributes.aSize as THREE.BufferAttribute
    const bAlphaAttr = burstGeometry.attributes.aAlpha as THREE.BufferAttribute

    const newBurst: BurstDatum[] = []
    for (let i = 0; i < burstData.current.length; i++) {
      const bd = burstData.current[i]
      bd.life += delta
      if (bd.life >= bd.maxLife) continue

      const t = bd.life / bd.maxLife
      bd.x += bd.vx * delta
      bd.y += bd.vy * delta
      bd.z += bd.vz * delta
      bd.vx *= 0.98
      bd.vy *= 0.98
      bd.vz *= 0.98

      const i3 = i * 3
      burstPositions[i3] = bd.x
      burstPositions[i3 + 1] = bd.y
      burstPositions[i3 + 2] = bd.z
      burstColors[i3] = r
      burstColors[i3 + 1] = g
      burstColors[i3 + 2] = b
      burstSizes[i] = particleSize * 0.3 * (1 - t)
      burstAlphas[i] = (1 - t) * 0.8

      newBurst.push(bd)
    }

    burstData.current = newBurst
    burstCount.current = newBurst.length
    burstGeometry.setDrawRange(0, burstCount.current)

    if (burstCount.current > 0) {
      bPosAttr.needsUpdate = true
      bColAttr.needsUpdate = true
      bSizeAttr.needsUpdate = true
      bAlphaAttr.needsUpdate = true
    }
  })

  return (
    <>
      <points
        ref={pointsRef}
        geometry={geometry}
        material={material}
        onClick={handleClick}
      />
      <points
        ref={burstRef}
        geometry={burstGeometry}
        material={burstMaterial}
      />
    </>
  )
}
