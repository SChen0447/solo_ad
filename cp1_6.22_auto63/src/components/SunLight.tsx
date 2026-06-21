import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { calculateSunPosition } from '@/utils/sunPosition'
import { SunPositionData } from '@/types'

interface SunLightProps {
  dayOfYear: number
  hourOfDay: number
  shadowMapSize?: number
}

export function SunLight({ dayOfYear, hourOfDay, shadowMapSize = 2048 }: SunLightProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const sunSphereRef = useRef<THREE.Mesh>(null)
  const targetPos = useRef(new THREE.Vector3())
  const currentPos = useRef(new THREE.Vector3())

  const sunPosition: SunPositionData = useMemo(() => {
    return calculateSunPosition(dayOfYear, hourOfDay)
  }, [dayOfYear, hourOfDay])

  useFrame((_state, delta) => {
    targetPos.current.set(sunPosition.x, sunPosition.y, sunPosition.z)

    if (lightRef.current) {
      currentPos.current.lerp(targetPos.current, delta * 5)
      lightRef.current.position.copy(currentPos.current)
      const intensity = sunPosition.altitude > 0 
        ? Math.min(1.5, Math.sin(sunPosition.altitude * Math.PI / 180) * 1.5)
        : 0
      lightRef.current.intensity = intensity
    }

    if (sunSphereRef.current) {
      sunSphereRef.current.position.copy(targetPos.current)
    }
  })

  const isDaytime = sunPosition.altitude > 0

  return (
    <group>
      <directionalLight
        ref={lightRef}
        castShadow={isDaytime}
        intensity={0}
        color="#FFF5E0"
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0005}
      />
      <mesh ref={sunSphereRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      <mesh ref={sunSphereRef}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.2} />
      </mesh>
      {isDaytime && (
        <pointLight
          position={[sunPosition.x, sunPosition.y, sunPosition.z]}
          intensity={0.3}
          color="#FFE4B5"
          distance={60}
          decay={2}
        />
      )}
    </group>
  )
}
