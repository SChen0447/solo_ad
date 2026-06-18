import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore, themePresets, ColorTheme } from '../App'

const PARTICLE_COUNT = 200
const INNER_RADIUS = 3
const OUTER_RADIUS = 4.5
const MIN_SIZE = 1
const MAX_SIZE = 1.5

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

export default function ParticleHalo() {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const breathFrequency = useAppStore((s) => s.breathFrequency)
  const colorTheme = useAppStore((s) => s.colorTheme)
  const isPlaying = useAppStore((s) => s.isPlaying)
  const manualBreath = useAppStore((s) => s.manualBreath)

  const timeRef = useRef(0)
  const manualProgressRef = useRef(1)
  const prevManualBreathRef = useRef(manualBreath)
  const prevThemeRef = useRef<ColorTheme>(colorTheme)
  const colorTransitionRef = useRef(1)

  const { positions, distances } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const dist = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = INNER_RADIUS + Math.random() * (OUTER_RADIUS - INNER_RADIUS)

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)

      dist[i] = (radius - INNER_RADIUS) / (OUTER_RADIUS - INNER_RADIUS)
    }

    return { positions: pos, distances: dist }
  }, [])

  const uniforms = useMemo(
    () => ({
      uColorStart: { value: new THREE.Color(themePresets[colorTheme].particleStart) },
      uColorEnd: { value: new THREE.Color(themePresets[colorTheme].particleEnd) },
      uBreathScale: { value: 1.0 },
      uTime: { value: 0.0 },
    }),
    []
  )

  useEffect(() => {
    if (prevThemeRef.current !== colorTheme) {
      colorTransitionRef.current = 0
      prevThemeRef.current = colorTheme
    }
  }, [colorTheme])

  useEffect(() => {
    if (prevManualBreathRef.current !== manualBreath) {
      manualProgressRef.current = 0
      prevManualBreathRef.current = manualBreath
    }
  }, [manualBreath])

  useFrame((_, delta) => {
    if (!pointsRef.current || !materialRef.current) return

    timeRef.current += delta

    if (colorTransitionRef.current < 1) {
      colorTransitionRef.current = Math.min(1, colorTransitionRef.current + delta / 0.8)
      const theme = themePresets[colorTheme]
      materialRef.current.uniforms.uColorStart.value.lerp(
        new THREE.Color(theme.particleStart),
        delta / 0.8
      )
      materialRef.current.uniforms.uColorEnd.value.lerp(
        new THREE.Color(theme.particleEnd),
        delta / 0.8
      )
    }

    let breathScale = 1
    if (isPlaying) {
      const t = (timeRef.current * breathFrequency) % 1
      breathScale = MIN_SIZE + easeInOutSine(t) * (MAX_SIZE - MIN_SIZE)
    }

    if (manualProgressRef.current < 1) {
      manualProgressRef.current = Math.min(1, manualProgressRef.current + delta * 2)
      const manualScale = MIN_SIZE + easeInOutSine(manualProgressRef.current) * (MAX_SIZE - MIN_SIZE)
      breathScale = isPlaying ? Math.max(breathScale, manualScale) : manualScale
    }

    materialRef.current.uniforms.uBreathScale.value = breathScale
    materialRef.current.uniforms.uTime.value = timeRef.current

    pointsRef.current.rotation.y += delta * 0.05
  })

  const vertexShader = `
    attribute float aDistance;
    uniform float uBreathScale;
    uniform float uTime;
    varying float vDistance;
    varying float vAlpha;
    void main() {
      vDistance = aDistance;
      vec3 pos = position;
      float noise = sin(uTime * 0.5 + position.x * 2.0 + position.y * 2.0) * 0.05;
      pos += normalize(pos) * noise;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = (6.0 + aDistance * 4.0) * uBreathScale * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
      vAlpha = 0.8 * (1.0 - aDistance);
    }
  `

  const fragmentShader = `
    uniform vec3 uColorStart;
    uniform vec3 uColorEnd;
    uniform float uBreathScale;
    varying float vDistance;
    varying float vAlpha;
    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      if (dist > 0.5) discard;

      float alpha = vAlpha * smoothstep(0.5, 0.1, dist);
      vec3 color = mix(uColorStart, uColorEnd, vDistance);
      float glow = smoothstep(0.5, 0.0, dist) * (0.5 + uBreathScale * 0.5);
      color += glow * 0.3;
      gl_FragColor = vec4(color, alpha);
    }
  `

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aDistance', new THREE.BufferAttribute(distances, 1))
    return geo
  }, [positions, distances])

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
