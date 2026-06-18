import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useParticleStore } from '../store'

export function GravitySphere() {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const { camera, gl, raycaster } = useThree()
  const [isDragging, setIsDragging] = useState(false)
  const [dragPlane, setDragPlane] = useState<THREE.Plane | null>(null)

  const gravityPosition = useParticleStore((s) => s.gravityPosition)
  const isGravityActive = useParticleStore((s) => s.isGravityActive)
  const setGravityPosition = useParticleStore((s) => s.setGravityPosition)
  const setIsGravityActive = useParticleStore((s) => s.setIsGravityActive)
  const motionMode = useParticleStore((s) => s.motionMode)

  useEffect(() => {
    if (motionMode === 'gravity') {
      setIsGravityActive(true)
    }
  }, [motionMode, setIsGravityActive])

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.5
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.3
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 0.7
      ring2Ref.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.2) * 0.5
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      glowRef.current.scale.setScalar(scale)
    }
  })

  const handlePointerOver = () => {
    if (isGravityActive) {
      document.body.style.cursor = 'grab'
    }
  }

  const handlePointerOut = () => {
    if (!isDragging) {
      document.body.style.cursor = 'default'
    }
  }

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    if (!isGravityActive) return

    setIsDragging(true)
    document.body.style.cursor = 'grabbing'
    e.target.setPointerCapture(e.pointerId)

    const normal = new THREE.Vector3()
    camera.getWorldDirection(normal)
    const plane = new THREE.Plane()
    plane.setFromNormalAndCoplanarPoint(normal.negate(), gravityPosition)
    setDragPlane(plane)
  }

  const handlePointerMove = (e: any) => {
    if (!isDragging || !dragPlane) return

    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    )

    raycaster.setFromCamera(mouse, camera)
    const intersectPoint = new THREE.Vector3()
    raycaster.ray.intersectPlane(dragPlane, intersectPoint)

    if (intersectPoint) {
      setGravityPosition(intersectPoint.clone())
    }
  }

  const handlePointerUp = (e: any) => {
    setIsDragging(false)
    setDragPlane(null)
    document.body.style.cursor = 'default'
    if (e.target && e.target.releasePointerCapture) {
      e.target.releasePointerCapture(e.pointerId)
    }
  }

  if (!isGravityActive && motionMode !== 'gravity') return null

  return (
    <group position={[gravityPosition.x, gravityPosition.y, gravityPosition.z]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.3}
        />
      </mesh>

      <mesh ref={glowRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.6, 64]} />
        <meshBasicMaterial
          color="#7b2ff7"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <ringGeometry args={[0.7, 0.75, 64]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  )
}
