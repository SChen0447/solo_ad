import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WindFieldManager, AltitudeLevel, speedToColor } from '../wind/WindFieldManager'

interface ParticleSystemProps {
  windManager: WindFieldManager
  particleCount: number
  altitudeLevel: AltitudeLevel
  isPlaying: boolean
}

const vertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) {
      discard;
    }
    float alpha = (1.0 - dist * 2.0) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`

export function ParticleSystem({ windManager, particleCount, altitudeLevel, isPlaying }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const [fadeOpacity, setFadeOpacity] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const prevLevelRef = useRef<AltitudeLevel>(altitudeLevel)
  const fadeOpacityRef = useRef(1)

  useEffect(() => {
    fadeOpacityRef.current = fadeOpacity
  }, [fadeOpacity])

  const { positions, colors, sizes, alphas } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const alphas = new Float32Array(particleCount)

    const particles = windManager.getParticles()
    for (let i = 0; i < Math.min(particles.length, particleCount); i++) {
      const p = particles[i]
      positions[i * 3] = p.position.x
      positions[i * 3 + 1] = p.position.y
      positions[i * 3 + 2] = p.position.z

      const color = speedToColor(p.speed)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] = p.size
      alphas[i] = 1.0
    }

    return { positions, colors, sizes, alphas }
  }, [particleCount, windManager])

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader,
      fragmentShader,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [])

  useEffect(() => {
    if (prevLevelRef.current !== altitudeLevel) {
      setIsTransitioning(true)
      setFadeOpacity(0)
      fadeOpacityRef.current = 0

      windManager.setAltitudeLevel(altitudeLevel)

      const startTime = Date.now()
      const duration = 500

      const animateFadeIn = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        setFadeOpacity(eased)
        fadeOpacityRef.current = eased

        if (progress < 1) {
          requestAnimationFrame(animateFadeIn)
        } else {
          setIsTransitioning(false)
          prevLevelRef.current = altitudeLevel
        }
      }

      requestAnimationFrame(animateFadeIn)
    }
  }, [altitudeLevel, windManager])

  useEffect(() => {
    windManager.setParticleCount(particleCount)
  }, [particleCount, windManager])

  useFrame((state, delta) => {
    if (!pointsRef.current || !isPlaying) return

    if (isTransitioning) {
      delta *= 0.3
    }

    windManager.update(delta)

    const particles = windManager.getParticles()
    const geometry = pointsRef.current.geometry
    const positionAttribute = geometry.attributes.position as THREE.BufferAttribute
    const colorAttribute = geometry.attributes.color as THREE.BufferAttribute
    const sizeAttribute = geometry.attributes.aSize as THREE.BufferAttribute
    const alphaAttribute = geometry.attributes.aAlpha as THREE.BufferAttribute

    const count = Math.min(particles.length, particleCount)
    const currentFade = fadeOpacityRef.current

    for (let i = 0; i < count; i++) {
      const p = particles[i]
      positionAttribute.setXYZ(i, p.position.x, p.position.y, p.position.z)

      const color = speedToColor(p.speed)
      colorAttribute.setXYZ(i, color.r, color.g, color.b)

      const lifeRatio = p.life / p.maxLife
      const lifeAlpha = lifeRatio < 0.1
        ? lifeRatio / 0.1
        : lifeRatio > 0.9
          ? (1 - lifeRatio) / 0.1
          : 1

      sizeAttribute.array[i] = p.size * 2
      alphaAttribute.array[i] = lifeAlpha * currentFade
    }

    positionAttribute.needsUpdate = true
    colorAttribute.needsUpdate = true
    sizeAttribute.needsUpdate = true
    alphaAttribute.needsUpdate = true
  })

  return (
    <points ref={pointsRef} material={shaderMaterial}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aAlpha"
          count={particleCount}
          array={alphas}
          itemSize={1}
        />
      </bufferGeometry>
    </points>
  )
}
