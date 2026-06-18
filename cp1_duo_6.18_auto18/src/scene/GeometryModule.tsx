import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore, themePresets, ColorTheme } from '../App'
import { generateVertexNoiseOffsets } from '../utils/noise'

const BASE_RADIUS = 2
const MIN_SCALE = 0.8
const MAX_SCALE = 1.2
const NOISE_AMPLITUDE = 0.1
const NOISE_FREQUENCY = 0.2

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

export default function GeometryModule() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const breathFrequency = useAppStore((s) => s.breathFrequency)
  const colorTheme = useAppStore((s) => s.colorTheme)
  const isPlaying = useAppStore((s) => s.isPlaying)
  const manualBreath = useAppStore((s) => s.manualBreath)

  const timeRef = useRef(0)
  const manualProgressRef = useRef(1)
  const prevManualBreathRef = useRef(manualBreath)
  const colorTransitionRef = useRef(1)
  const prevThemeRef = useRef<ColorTheme>(colorTheme)

  const { basePositions, geometry } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(BASE_RADIUS, 4)
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const base = new Float32Array(posAttr.array)
    return { basePositions: base, geometry: geo }
  }, [])

  const uniforms = useMemo(
    () => ({
      uColorStart: { value: new THREE.Color(themePresets[colorTheme].geometryStart) },
      uColorEnd: { value: new THREE.Color(themePresets[colorTheme].geometryEnd) },
      uColorMix: { value: 0 },
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
    if (!meshRef.current || !materialRef.current) return

    timeRef.current += delta

    if (colorTransitionRef.current < 1) {
      colorTransitionRef.current = Math.min(1, colorTransitionRef.current + delta / 0.8)
      const theme = themePresets[colorTheme]
      materialRef.current.uniforms.uColorStart.value.lerp(
        new THREE.Color(theme.geometryStart),
        delta / 0.8
      )
      materialRef.current.uniforms.uColorEnd.value.lerp(
        new THREE.Color(theme.geometryEnd),
        delta / 0.8
      )
    }

    materialRef.current.uniforms.uColorMix.value = (Math.sin(timeRef.current * 0.5) + 1) / 2

    let breathScale = 1
    if (isPlaying) {
      const t = (timeRef.current * breathFrequency) % 1
      breathScale = MIN_SCALE + easeInOutSine(t) * (MAX_SCALE - MIN_SCALE)
    }

    if (manualProgressRef.current < 1) {
      manualProgressRef.current = Math.min(1, manualProgressRef.current + delta * 2)
      const manualScale = MIN_SCALE + easeInOutSine(manualProgressRef.current) * (MAX_SCALE - MIN_SCALE)
      breathScale = isPlaying ? Math.max(breathScale, manualScale) : manualScale
    }

    meshRef.current.scale.setScalar(breathScale)
    meshRef.current.rotation.y += delta * 0.1

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const noiseOffsets = generateVertexNoiseOffsets(
      basePositions,
      timeRef.current,
      NOISE_AMPLITUDE,
      NOISE_FREQUENCY
    )

    const arr = posAttr.array as Float32Array
    for (let i = 0; i < basePositions.length; i++) {
      arr[i] = basePositions[i] + noiseOffsets[i]
    }
    posAttr.needsUpdate = true
    geometry.computeVertexNormals()
  })

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const fragmentShader = `
    uniform vec3 uColorStart;
    uniform vec3 uColorEnd;
    uniform float uColorMix;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float mixFactor = (normalize(vPosition).y + 1.0) / 2.0;
      mixFactor = mix(mixFactor, uColorMix, 0.3);
      vec3 color = mix(uColorStart, uColorEnd, mixFactor);
      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
      color += fresnel * 0.2;
      gl_FragColor = vec4(color, 1.0);
    }
  `

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
