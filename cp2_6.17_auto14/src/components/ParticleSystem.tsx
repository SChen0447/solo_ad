import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore, EMOTION_CONFIGS, EmotionConfig } from '@/store/useStore'

const MAX_PARTICLES = 3000
const MAX_BURST = 200
const EMOTION_TRANSITION_SEC = 1.5
const COUNT_TRANSITION_SEC = 0.5

function normalizeHue(h: number): number {
  let nh = h % 360
  if (nh < 0) nh += 360
  return nh
}

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
  const na = normalizeHue(a)
  const nb = normalizeHue(b)
  let diff = nb - na
  if (diff > 180) diff -= 360
  if (diff <= -180) diff += 360
  const result = na + diff * t
  return normalizeHue(result)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpPos(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
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
  radialAngle: number
  radialSpeed: number
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
  originX: number
  originY: number
  originZ: number
}

function computeParticlePosition(
  d: ParticleDatum,
  time: number,
  speed: number,
  amplitude: number,
  config: EmotionConfig
): [number, number, number] {
  const fs = config.freqScale
  const baseOffsetX = Math.sin(time * d.freqX * speed * fs + d.phaseX) * amplitude
  const baseOffsetY = Math.sin(time * d.freqY * speed * fs + d.phaseY) * amplitude
  const baseOffsetZ = Math.sin(time * d.freqZ * speed * fs + d.phaseZ) * amplitude

  switch (config.motionType) {
    case 'scatter': {
      const radialDrift = Math.sin(time * d.radialSpeed * speed + d.radialAngle) * amplitude * 0.5
      const dirX = Math.cos(d.radialAngle)
      const dirZ = Math.sin(d.radialAngle)
      return [
        d.baseX + baseOffsetX + dirX * radialDrift,
        d.baseY + baseOffsetY,
        d.baseZ + baseOffsetZ + dirZ * radialDrift,
      ]
    }
    case 'float': {
      const drift = Math.sin(time * 0.1 * speed + d.phaseX * 0.5) * amplitude * 0.3
      return [
        d.baseX + baseOffsetX * 0.5 + drift,
        d.baseY + baseOffsetY + Math.sin(time * 0.15 * speed + d.phaseY) * amplitude * 0.4,
        d.baseZ + baseOffsetZ * 0.5,
      ]
    }
    case 'sink': {
      const sinkPhase = (time * 0.3 * speed + d.phaseY) % (Math.PI * 2)
      const sinkOffset = (sinkPhase / (Math.PI * 2)) * amplitude * 2
      return [
        d.baseX + baseOffsetX * 0.6,
        d.baseY + baseOffsetY * 0.4 - sinkOffset + amplitude,
        d.baseZ + baseOffsetZ * 0.5,
      ]
    }
    case 'oscillate': {
      const pulse = Math.sin(time * d.freqX * speed * fs * 2 + d.phaseX) * amplitude * 1.2
      return [
        d.baseX + pulse,
        d.baseY + baseOffsetY * 1.5,
        d.baseZ + Math.cos(time * d.freqZ * speed * fs * 2 + d.phaseZ) * amplitude * 1.2,
      ]
    }
    default:
      return [d.baseX + baseOffsetX, d.baseY + baseOffsetY, d.baseZ + baseOffsetZ]
  }
}

const INITIAL_COUNT = typeof window !== 'undefined' && window.innerWidth < 768 ? 500 : 1000

export default function ParticleSystem() {
  const emotionMode = useStore((s) => s.emotionMode)
  const particleCount = useStore((s) => s.particleCount)
  const particleSize = useStore((s) => s.particleSize)
  const motionSpeed = useStore((s) => s.motionSpeed)

  const pointsRef = useRef<THREE.Points>(null)
  const burstRef = useRef<THREE.Points>(null)

  const particleData = useRef<ParticleDatum[]>([])
  const currentHSL = useRef<[number, number, number]>([48, 100, 62])
  const targetHSL = useRef<[number, number, number]>([48, 100, 62])
  const transitionStartHSL = useRef<[number, number, number]>([48, 100, 62])
  const transitionProgress = useRef(1)

  const prevMotionType = useRef<EmotionConfig['motionType']>('scatter')
  const targetMotionType = useRef<EmotionConfig['motionType']>('scatter')
  const currentSpeedMult = useRef(1.5)
  const targetSpeedMult = useRef(1.5)
  const currentAmplitudeMult = useRef(1.8)
  const targetAmplitudeMult = useRef(1.8)
  const currentFreqScale = useRef(1.4)
  const targetFreqScale = useRef(1.4)
  const motionTransitionProgress = useRef(1)
  const motionTransitionStartSpeed = useRef(1.5)
  const motionTransitionStartAmplitude = useRef(1.8)
  const motionTransitionStartFreq = useRef(1.4)

  const prevMotionConfig = useRef<EmotionConfig>(EMOTION_CONFIGS.joy)
  const targetMotionConfig = useRef<EmotionConfig>(EMOTION_CONFIGS.joy)

  const highlightState = useRef<HighlightState | null>(null)
  const burstData = useRef<BurstDatum[]>([])
  const burstCount = useRef(0)

  const drawnCount = useRef(INITIAL_COUNT)
  const countTransition = useRef(1)
  const countFrom = useRef(INITIAL_COUNT)

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
        radialAngle: Math.random() * Math.PI * 2,
        radialSpeed: 0.2 + Math.random() * 0.5,
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
    geo.setDrawRange(0, INITIAL_COUNT)
    drawnCount.current = INITIAL_COUNT
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

  useEffect(() => {
    const config = EMOTION_CONFIGS[emotionMode]
    transitionStartHSL.current = [...currentHSL.current] as [number, number, number]
    targetHSL.current = [...config.color] as [number, number, number]
    transitionProgress.current = 0

    prevMotionConfig.current = {
      ...EMOTION_CONFIGS[emotionMode],
      motionType: prevMotionType.current,
      speedMultiplier: currentSpeedMult.current,
      amplitudeMultiplier: currentAmplitudeMult.current,
      freqScale: currentFreqScale.current,
    }
    targetMotionConfig.current = { ...config }
    targetMotionType.current = config.motionType
    motionTransitionStartSpeed.current = currentSpeedMult.current
    motionTransitionStartAmplitude.current = currentAmplitudeMult.current
    motionTransitionStartFreq.current = currentFreqScale.current
    targetSpeedMult.current = config.speedMultiplier
    targetAmplitudeMult.current = config.amplitudeMultiplier
    targetFreqScale.current = config.freqScale
    motionTransitionProgress.current = 0
  }, [emotionMode])

  useEffect(() => {
    const clampedCount = Math.max(1, Math.min(MAX_PARTICLES, particleCount))
    if (clampedCount !== drawnCount.current) {
      countFrom.current = Math.max(1, drawnCount.current)
      countTransition.current = 0
    }
  }, [particleCount])

  useEffect(() => {
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
        x: Number(x),
        y: Number(y),
        z: Number(z),
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.sin(phi) * Math.sin(theta) * speed,
        vz: Math.cos(phi) * speed,
        life: 0,
        maxLife: 1.5 + Math.random() * 0.5,
      })
    }
    burstCount.current = burstData.current.length
  }, [])

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      if (highlightState.current && highlightState.current.phase !== 'done') return
      if (!pointsRef.current) return

      const pointIndex = event.index
      if (pointIndex === undefined || pointIndex < 0 || pointIndex >= drawnCount.current) return

      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize()

      const i3 = pointIndex * 3
      highlightState.current = {
        index: pointIndex,
        startTime: performance.now(),
        flyDirX: dir.x * 15,
        flyDirY: dir.y * 15,
        flyDirZ: dir.z * 15,
        phase: 'highlight',
        burstSpawned: false,
        originX: positions[i3],
        originY: positions[i3 + 1],
        originZ: positions[i3 + 2],
      }
    },
    []
  )

  useFrame(() => {
    const now = performance.now()
    const timeSec = now / 1000

    const delta = 1 / 60

    if (transitionProgress.current < 1) {
      transitionProgress.current = Math.min(
        1,
        transitionProgress.current + delta / EMOTION_TRANSITION_SEC
      )
      const t = easeOutCubic(transitionProgress.current)
      currentHSL.current = [
        lerpHue(transitionStartHSL.current[0], targetHSL.current[0], t),
        lerp(transitionStartHSL.current[1], targetHSL.current[1], t),
        lerp(transitionStartHSL.current[2], targetHSL.current[2], t),
      ]
    }

    if (motionTransitionProgress.current < 1) {
      motionTransitionProgress.current = Math.min(
        1,
        motionTransitionProgress.current + delta / EMOTION_TRANSITION_SEC
      )
      const t = easeOutCubic(motionTransitionProgress.current)
      currentSpeedMult.current = lerp(motionTransitionStartSpeed.current, targetSpeedMult.current, t)
      currentAmplitudeMult.current = lerp(motionTransitionStartAmplitude.current, targetAmplitudeMult.current, t)
      currentFreqScale.current = lerp(motionTransitionStartFreq.current, targetFreqScale.current, t)
      if (t >= 1) {
        prevMotionType.current = targetMotionType.current
      }
    }

    if (countTransition.current < 1) {
      countTransition.current = Math.min(1, countTransition.current + delta / COUNT_TRANSITION_SEC)
      const t = easeOutCubic(countTransition.current)
      const current = Math.max(1, Math.round(lerp(countFrom.current, particleCount, t)))
      drawnCount.current = current
      geometry.setDrawRange(0, current)
    }

    if (sizeTransition.current < 1) {
      sizeTransition.current = Math.min(1, sizeTransition.current + delta / COUNT_TRANSITION_SEC)
    }

    const speed = motionSpeed * currentSpeedMult.current
    const amplitude = currentAmplitudeMult.current
    const [r, g, b] = hslToRgb(...currentHSL.current)

    const motionT = motionTransitionProgress.current
    const blending = motionT < 1

    const prevConfig: EmotionConfig = {
      ...prevMotionConfig.current,
      speedMultiplier: currentSpeedMult.current,
      amplitudeMultiplier: currentAmplitudeMult.current,
      freqScale: currentFreqScale.current,
    }
    const nextConfig: EmotionConfig = {
      ...targetMotionConfig.current,
      speedMultiplier: currentSpeedMult.current,
      amplitudeMultiplier: currentAmplitudeMult.current,
      freqScale: currentFreqScale.current,
    }

    const hl = highlightState.current
    const hlActive = hl && hl.phase !== 'done'
    const hlIndex = hlActive ? hl!.index : -1

    const count = drawnCount.current

    for (let i = 0; i < count; i++) {
      const d = particleData.current[i]
      const i3 = i * 3

      if (i === hlIndex) {
        const hlState = hl!
        const elapsed = (now - hlState.startTime) / 1000

        if (hlState.phase === 'highlight') {
          if (elapsed < 0.3) {
            const ht = elapsed / 0.3
            const posOld = computeParticlePosition(d, timeSec, speed, amplitude, prevConfig)
            let pos: [number, number, number]
            if (blending) {
              const posNew = computeParticlePosition(d, timeSec, speed, amplitude, nextConfig)
              pos = lerpPos(posOld, posNew, motionT)
            } else {
              pos = posOld
            }
            positions[i3] = pos[0]
            positions[i3 + 1] = pos[1]
            positions[i3 + 2] = pos[2]
            sizes[i] = particleSize * d.sizeFactor * (1 + ht * 2)
            colors[i3] = lerp(r + d.colorOffset, 1, ht)
            colors[i3 + 1] = lerp(g + d.colorOffset * 0.5, 1, ht)
            colors[i3 + 2] = lerp(b + d.colorOffset * 0.3, 1, ht)
            alphas[i] = 1
          } else {
            hlState.phase = 'flyout'
            hlState.startTime = now
            hlState.originX = positions[i3]
            hlState.originY = positions[i3 + 1]
            hlState.originZ = positions[i3 + 2]
            if (!hlState.burstSpawned) {
              spawnBurst(positions[i3], positions[i3 + 1], positions[i3 + 2])
              hlState.burstSpawned = true
            }
          }
        }

        if (hlState.phase === 'flyout') {
          const flyElapsed = (now - hlState.startTime) / 1000
          if (flyElapsed < 2) {
            const ft = flyElapsed / 2
            positions[i3] = hlState.originX + hlState.flyDirX * ft
            positions[i3 + 1] = hlState.originY + hlState.flyDirY * ft
            positions[i3 + 2] = hlState.originZ + hlState.flyDirZ * ft
            sizes[i] = particleSize * d.sizeFactor * 3 * (1 - ft)
            colors[i3] = 1
            colors[i3 + 1] = 1
            colors[i3 + 2] = 1
            alphas[i] = 1 - ft
          } else {
            hlState.phase = 'done'
            d.baseX = (Math.random() - 0.5) * 30
            d.baseY = (Math.random() - 0.5) * 30
            d.baseZ = (Math.random() - 0.5) * 30
            d.phaseX = Math.random() * Math.PI * 2
            d.phaseY = Math.random() * Math.PI * 2
            d.phaseZ = Math.random() * Math.PI * 2
          }
        }
        continue
      }

      if (blending) {
        const posOld = computeParticlePosition(d, timeSec, speed, amplitude, prevConfig)
        const posNew = computeParticlePosition(d, timeSec, speed, amplitude, nextConfig)
        const pos = lerpPos(posOld, posNew, motionT)
        positions[i3] = pos[0]
        positions[i3 + 1] = pos[1]
        positions[i3 + 2] = pos[2]
      } else {
        const pos = computeParticlePosition(d, timeSec, speed, amplitude, prevConfig)
        positions[i3] = pos[0]
        positions[i3 + 1] = pos[1]
        positions[i3 + 2] = pos[2]
      }

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
      bd.vx *= 0.97
      bd.vy *= 0.97
      bd.vz *= 0.97

      const i3 = i * 3
      burstPositions[i3] = bd.x
      burstPositions[i3 + 1] = bd.y
      burstPositions[i3 + 2] = bd.z
      burstColors[i3] = r
      burstColors[i3 + 1] = g
      burstColors[i3 + 2] = b
      burstSizes[i] = particleSize * 0.4 * (1 - t)
      burstAlphas[i] = (1 - t) * 0.9

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
        onPointerDown={handlePointerDown}
      />
      <points
        ref={burstRef}
        geometry={burstGeometry}
        material={burstMaterial}
      />
    </>
  )
}
