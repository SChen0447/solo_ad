import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/store'
import { sliceScale } from './PartMesh'
import Skeleton from './Skeleton'
import Muscles from './Muscles'
import Vessels from './Vessels'
import SkinLayer from './SkinLayer'

const ClippingConfigurator: React.FC<{
  clipPlane: THREE.Plane | null
  slicePosition: number
}> = ({ clipPlane, slicePosition }) => {
  const { gl } = useThree()
  useEffect(() => {
    gl.localClippingEnabled = slicePosition < 100
  }, [gl, clipPlane, slicePosition])
  return null
}

const InitialCamera: React.FC = () => {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(6.5, 3.5, 8.5)
    camera.lookAt(0, -0.5, 0)
  }, [camera])
  return null
}

const SliceVisualizer: React.FC<{
  clipPlane: THREE.Plane | null
  slicePosition: number
}> = ({ clipPlane, slicePosition }) => {
  if (!clipPlane || slicePosition >= 100) return null
  const sliceY = sliceScale(slicePosition)
  return (
    <group position={[0, sliceY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[5.98, 6, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const SceneContent: React.FC = () => {
  const slicePosition = useStore((s) => s.slicePosition)
  const [currentSlice, setCurrentSlice] = useState(slicePosition)
  const animRef = useRef<number | null>(null)
  const startRef = useRef(slicePosition)
  const targetRef = useRef(slicePosition)
  const startTimeRef = useRef(0)
  const ANIM_DURATION = 0.5

  const clipPlane = useMemo(() => {
    if (currentSlice >= 100) return null
    const y = sliceScale(currentSlice)
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -y)
  }, [currentSlice])

  useEffect(() => {
    if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    startRef.current = currentSlice
    targetRef.current = slicePosition
    startTimeRef.current = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000
      const t = Math.min(1, elapsed / ANIM_DURATION)
      const eased = 1 - Math.pow(1 - t, 3)
      const newVal = startRef.current + (targetRef.current - startRef.current) * eased
      setCurrentSlice(newVal)
      if (t < 1) animRef.current = requestAnimationFrame(animate)
      else animRef.current = null
    }
    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    }
  }, [slicePosition])

  return (
    <>
      <ClippingConfigurator clipPlane={clipPlane} slicePosition={currentSlice} />
      <InitialCamera />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 8, 6]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-4, 3, -4]} intensity={0.4} />
      <pointLight position={[0, 0, 5]} intensity={0.3} color="#00d4ff" />
      <pointLight position={[0, -3, -3]} intensity={0.25} color="#6688ff" />

      <Skeleton clipPlane={clipPlane} />
      <Muscles clipPlane={clipPlane} />
      <Vessels clipPlane={clipPlane} />
      <SkinLayer clipPlane={clipPlane} />

      <SliceVisualizer clipPlane={clipPlane} slicePosition={currentSlice} />
      <gridHelper args={[20, 20, '#00d4ff20', '#ffffff08']} position={[0, -5.2, 0]} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.3}
        zoomSpeed={0.9}
        panSpeed={0.8}
        minDistance={3}
        maxDistance={18}
        screenSpacePanning={false}
        target={[0, -0.5, 0]}
        keyPanSpeed={12}
      />
    </>
  )
}

const Scene: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 100, position: [6.5, 3.5, 8.5] }}
        gl={{ antialias: true, alpha: false, localClippingEnabled: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={[0.04, 0.09, 0.16]} />
        <fog attach="fog" args={['#0a1628', 18, 32]} />
        <SceneContent />
      </Canvas>
    </div>
  )
}

export default Scene
