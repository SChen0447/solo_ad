import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { SentenceEmotion, aggregateEmotions } from './emotionAnalyzer'

interface ParticleParams {
  rotationSpeed: number
  diffusion: number
  saturation: number
}

interface ParticleSystemProps {
  emotions: SentenceEmotion[]
  params: ParticleParams
}

const vertexShader = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  
  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    gl_FragColor = vec4(vColor, alpha);
  }
`

const ParticleSystem: React.FC<ParticleSystemProps> = ({ emotions, params }) => {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera } = useThree()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const particleCount = isMobile ? 2000 : 5000

  const { positions, colors, sizes, particleData } = useMemo(() => {
    const emotionsAgg = aggregateEmotions(emotions)
    const total = emotionsAgg.positive + emotionsAgg.negative + emotionsAgg.surprise + emotionsAgg.anger || 1

    const counts = {
      positive: Math.round(particleCount * (emotionsAgg.positive / total)),
      negative: Math.round(particleCount * (emotionsAgg.negative / total)),
      surprise: Math.round(particleCount * (emotionsAgg.surprise / total)),
      anger: Math.round(particleCount * (emotionsAgg.anger / total))
    }

    const remaining = particleCount - counts.positive - counts.negative - counts.surprise - counts.anger
    counts.positive += Math.max(0, remaining)

    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const particleData: Array<{
      type: 'positive' | 'negative' | 'surprise' | 'anger'
      basePos: THREE.Vector3
      angle: number
      radius: number
      jumpTimer: number
      shakeOffset: THREE.Vector3
      shakePhase: number
    }> = []

    const positiveColor = new THREE.Color('#ff6b6b')
    const positiveColorEnd = new THREE.Color('#ffd93d')
    const negativeColor = new THREE.Color('#6c5ce7')
    const negativeColorEnd = new THREE.Color('#00cec9')
    const surpriseColor = new THREE.Color('#ffeaa7')
    const angerColor = new THREE.Color('#ff4757')

    let idx = 0

    for (let i = 0; i < counts.positive; i++, idx++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 5 + Math.random() * 10

      positions[idx * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[idx * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[idx * 3 + 2] = radius * Math.cos(phi)

      const t = Math.random()
      const color = positiveColor.clone().lerp(positiveColorEnd, t)
      colors[idx * 3] = color.r
      colors[idx * 3 + 1] = color.g
      colors[idx * 3 + 2] = color.b

      sizes[idx] = 2 + Math.random() * 2

      particleData.push({
        type: 'positive',
        basePos: new THREE.Vector3(
          positions[idx * 3],
          positions[idx * 3 + 1],
          positions[idx * 3 + 2]
        ),
        angle: theta,
        radius: radius,
        jumpTimer: 0,
        shakeOffset: new THREE.Vector3(),
        shakePhase: Math.random() * Math.PI * 2
      })
    }

    for (let i = 0; i < counts.negative; i++, idx++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 8 + Math.random() * 7

      positions[idx * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[idx * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[idx * 3 + 2] = radius * Math.cos(phi)

      const t = Math.random()
      const color = negativeColor.clone().lerp(negativeColorEnd, t)
      colors[idx * 3] = color.r
      colors[idx * 3 + 1] = color.g
      colors[idx * 3 + 2] = color.b

      sizes[idx] = 1 + Math.random() * 2

      particleData.push({
        type: 'negative',
        basePos: new THREE.Vector3(
          positions[idx * 3],
          positions[idx * 3 + 1],
          positions[idx * 3 + 2]
        ),
        angle: theta,
        radius: radius,
        jumpTimer: 0,
        shakeOffset: new THREE.Vector3(),
        shakePhase: Math.random() * Math.PI * 2
      })
    }

    for (let i = 0; i < counts.surprise; i++, idx++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 3 + Math.random() * 12

      positions[idx * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[idx * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[idx * 3 + 2] = radius * Math.cos(phi)

      colors[idx * 3] = surpriseColor.r
      colors[idx * 3 + 1] = surpriseColor.g
      colors[idx * 3 + 2] = surpriseColor.b

      sizes[idx] = 3

      particleData.push({
        type: 'surprise',
        basePos: new THREE.Vector3(
          positions[idx * 3],
          positions[idx * 3 + 1],
          positions[idx * 3 + 2]
        ),
        angle: theta,
        radius: radius,
        jumpTimer: Math.random() * 2,
        shakeOffset: new THREE.Vector3(),
        shakePhase: Math.random() * Math.PI * 2
      })
    }

    for (let i = 0; i < counts.anger; i++, idx++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 2 + Math.random() * 13

      positions[idx * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[idx * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[idx * 3 + 2] = radius * Math.cos(phi)

      colors[idx * 3] = angerColor.r
      colors[idx * 3 + 1] = angerColor.g
      colors[idx * 3 + 2] = angerColor.b

      sizes[idx] = 4

      particleData.push({
        type: 'anger',
        basePos: new THREE.Vector3(
          positions[idx * 3],
          positions[idx * 3 + 1],
          positions[idx * 3 + 2]
        ),
        angle: theta,
        radius: radius,
        jumpTimer: 0,
        shakeOffset: new THREE.Vector3(),
        shakePhase: Math.random() * Math.PI * 2
      })
    }

    return { positions, colors, sizes, particleData }
  }, [emotions, particleCount])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [positions, colors, sizes])

  const material = useMemo(() => {
    const intensity = isMobile ? 0.5 : 1.0
    const saturation = params.saturation

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        saturation: { value: saturation },
        intensity: { value: intensity }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.saturation = { value: saturation }
      shader.fragmentShader = `
        uniform float saturation;
        uniform float intensity;
        ${shader.fragmentShader}
      `.replace(
        'gl_FragColor = vec4(vColor, alpha);',
        `
          vec3 color = vColor;
          float gray = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(vec3(gray), color, saturation);
          color *= intensity;
          gl_FragColor = vec4(color, alpha);
        `
      )
    }

    return mat
  }, [params.saturation, isMobile])

  useFrame((state, delta) => {
    if (!pointsRef.current) return

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
    const colors = pointsRef.current.geometry.attributes.customColor.array as Float32Array
    const sizes = pointsRef.current.geometry.attributes.size.array as Float32Array

    const rotationSpeed = params.rotationSpeed
    const diffusion = params.diffusion

    for (let i = 0; i < particleCount; i++) {
      const data = particleData[i]
      if (!data) continue

      if (data.type === 'positive') {
        data.angle += 0.5 * rotationSpeed * delta
        data.radius += 0.2 * diffusion * delta

        if (data.radius > 15) data.radius = 5

        const phi = Math.acos(2 * ((i * 0.618) % 1) - 1)
        positions[i * 3] = data.radius * Math.sin(phi) * Math.cos(data.angle)
        positions[i * 3 + 1] = data.radius * Math.sin(phi) * Math.sin(data.angle)
        positions[i * 3 + 2] = data.radius * Math.cos(phi)
      } else if (data.type === 'negative') {
        data.radius -= 0.1 * delta

        if (data.radius < 2) data.radius = 15

        const theta = data.angle
        const phi = Math.acos(2 * ((i * 0.618) % 1) - 1)
        positions[i * 3] = data.radius * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = data.radius * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = data.radius * Math.cos(phi)
      } else if (data.type === 'surprise') {
        data.jumpTimer += delta

        if (data.jumpTimer >= 2) {
          data.jumpTimer = 0
          const jumpDist = 1 + Math.random() * 2
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)
          data.basePos.x += jumpDist * Math.sin(phi) * Math.cos(theta)
          data.basePos.y += jumpDist * Math.sin(phi) * Math.sin(theta)
          data.basePos.z += jumpDist * Math.cos(phi)

          const dist = data.basePos.length()
          if (dist > 15) {
            data.basePos.normalize().multiplyScalar(15)
          }
        }

        positions[i * 3] = data.basePos.x
        positions[i * 3 + 1] = data.basePos.y
        positions[i * 3 + 2] = data.basePos.z
      } else if (data.type === 'anger') {
        data.shakePhase += 10 * Math.PI * 2 * delta
        const shakeAmplitude = 0.3 * diffusion

        positions[i * 3] = data.basePos.x + Math.sin(data.shakePhase) * shakeAmplitude
        positions[i * 3 + 1] = data.basePos.y + Math.cos(data.shakePhase * 1.3) * shakeAmplitude
        positions[i * 3 + 2] = data.basePos.z + Math.sin(data.shakePhase * 0.7) * shakeAmplitude
      }

      if (params.saturation !== 1) {
        const r = colors[i * 3]
        const g = colors[i * 3 + 1]
        const b = colors[i * 3 + 2]
        const gray = r * 0.299 + g * 0.587 + b * 0.114
        colors[i * 3] = gray + (r - gray) * params.saturation
        colors[i * 3 + 1] = gray + (g - gray) * params.saturation
        colors[i * 3 + 2] = gray + (b - gray) * params.saturation
      }

      const pos = new THREE.Vector3(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      )
      const dist = camera.position.distanceTo(pos)
      const normalizedDist = Math.max(0, Math.min(1, (dist - 5) / 35))
      sizes[i] = 4 - normalizedDist * 3
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.customColor.needsUpdate = true
    pointsRef.current.geometry.attributes.size.needsUpdate = true
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}

interface ParticleRendererProps {
  emotions: SentenceEmotion[]
  params: ParticleParams
}

export const ParticleRenderer: React.FC<ParticleRendererProps> = ({ emotions, params }) => {
  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [0, 0, 25], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: '#0a0a1a' }}
      >
        <OrbitControls
          enableDamping
          dampingFactor={0.9}
          minDistance={5}
          maxDistance={40}
        />
        <ParticleSystem emotions={emotions} params={params} />
      </Canvas>
    </div>
  )
}
