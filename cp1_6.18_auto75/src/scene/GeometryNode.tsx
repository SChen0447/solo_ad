import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { GeometryItem } from '../types'
import { useSceneStore } from '../store/sceneStore'
import { easeOutElastic } from '../utils/animationUtils'

interface GeometryNodeProps {
  geometry: GeometryItem
  highQuality: boolean
}

const GeometryNode = ({ geometry, highQuality }: GeometryNodeProps) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowMeshRef = useRef<THREE.Mesh>(null)
  const selectedId = useSceneStore((s) => s.selectedId)
  const selectGeometry = useSceneStore((s) => s.selectGeometry)
  const removeGeometry = useSceneStore((s) => s.removeGeometry)

  const [animProgress, setAnimProgress] = useState(0)
  const [isDisappearing, setIsDisappearing] = useState(false)
  const [hovered, setHovered] = useState(false)

  const isSelected = selectedId === geometry.id

  useEffect(() => {
    let frame: number
    const start = performance.now()
    const duration = 800

    const animate = () => {
      const elapsed = performance.now() - start
      const t = Math.min(elapsed / duration, 1)
      setAnimProgress(easeOutElastic(t))
      if (t < 1) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const actualGeometry = useMemo(() => {
    switch (geometry.type) {
      case 'box':
        return new THREE.BoxGeometry(1, 1, 1)
      case 'sphere':
        return new THREE.SphereGeometry(0.6, highQuality ? 64 : 32, highQuality ? 64 : 32)
      case 'torus':
        return new THREE.TorusGeometry(0.5, 0.18, highQuality ? 32 : 16, highQuality ? 64 : 32)
      case 'cone':
        return new THREE.ConeGeometry(0.55, 1.1, highQuality ? 48 : 24)
      default:
        return new THREE.BoxGeometry(1, 1, 1)
    }
  }, [geometry.type, highQuality])

  const glowGeometry = useMemo(() => {
    switch (geometry.type) {
      case 'box':
        return new THREE.BoxGeometry(1.08, 1.08, 1.08)
      case 'sphere':
        return new THREE.SphereGeometry(0.68, 32, 32)
      case 'torus':
        return new THREE.TorusGeometry(0.58, 0.24, 16, 48)
      case 'cone':
        return new THREE.ConeGeometry(0.62, 1.2, 32)
      default:
        return new THREE.BoxGeometry(1.08, 1.08, 1.08)
    }
  }, [geometry.type])

  useFrame((_, delta) => {
    if (meshRef.current) {
      const targetScale = isDisappearing ? 0 : geometry.scale * animProgress
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8)

      if (isSelected || hovered) {
        meshRef.current.scale.x *= 1.03
        meshRef.current.scale.y *= 1.03
        meshRef.current.scale.z *= 1.03
      }
    }

    if (glowMeshRef.current) {
      const targetScale = isDisappearing ? 0 : geometry.scale * animProgress * 1.05
      glowMeshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8)

      const glowMat = glowMeshRef.current.material as THREE.ShaderMaterial
      glowMat.uniforms.uTime.value += delta
      const targetGlowOpacity = (isSelected ? 0.35 : hovered ? 0.2 : 0.1) * animProgress * (isDisappearing ? 0 : 1)
      glowMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(glowMat.uniforms.uOpacity.value, targetGlowOpacity, delta * 5)
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectGeometry(geometry.id)
  }

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    setHovered(false)
    document.body.style.cursor = 'default'
  }

  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.1 },
        uColor: { value: new THREE.Color(geometry.material.color) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColor;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
          gl_FragColor = vec4(uColor, fresnel * uOpacity * pulse);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [geometry.material.color])

  useEffect(() => {
    return () => {
      actualGeometry.dispose()
      glowGeometry.dispose()
      glowMaterial.dispose()
    }
  }, [actualGeometry, glowGeometry, glowMaterial])

  const rotation = useMemo(() => {
    return new THREE.Euler(
      THREE.MathUtils.degToRad(geometry.rotation.pitch),
      THREE.MathUtils.degToRad(geometry.rotation.yaw),
      THREE.MathUtils.degToRad(geometry.rotation.roll)
    )
  }, [geometry.rotation])

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[geometry.position.x, geometry.position.y, geometry.position.z]}
        rotation={rotation}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
        geometry={actualGeometry}
      >
        <meshStandardMaterial
          color={geometry.material.color}
          metalness={geometry.material.metalness}
          roughness={geometry.material.roughness}
          envMapIntensity={highQuality ? 1.2 : 0.6}
        />
      </mesh>

      <mesh
        ref={glowMeshRef}
        position={[geometry.position.x, geometry.position.y, geometry.position.z]}
        rotation={rotation}
        geometry={glowGeometry}
        material={glowMaterial}
      />
    </group>
  )
}

export default GeometryNode
