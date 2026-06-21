import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Planet from './Planet'
import { planetsData, sunData, type PlanetData } from './data/planets'

interface SolarSystemProps {
  onPlanetClick: (data: PlanetData) => void
  speedMultiplier: number
}

export default function SolarSystem({ onPlanetClick, speedMultiplier }: SolarSystemProps) {
  const sunRef = useRef<THREE.Mesh>(null)
  const planetAngles = useRef<number[]>(planetsData.map(() => Math.random() * Math.PI * 2))

  const sunGlowTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    gradient.addColorStop(0, '#ffdd66ff')
    gradient.addColorStop(0.2, '#ffaa00aa')
    gradient.addColorStop(0.5, '#ff660044')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    return new THREE.CanvasTexture(canvas)
  }, [])

  const orbitRadii = useMemo(() => {
    return planetsData.map((planet) => planet.orbitRadius)
  }, [])

  useFrame((_, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.1
    }

    planetsData.forEach((planet, index) => {
      planetAngles.current[index] += delta * planet.orbitSpeed * 0.2 * speedMultiplier
    })
  })

  const getPlanetPosition = (index: number): [number, number, number] => {
    const angle = planetAngles.current[index]
    const radius = planetsData[index].orbitRadius
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius]
  }

  const handleSunClick = () => {
    onPlanetClick({
      id: 'sun',
      name: sunData.name,
      englishName: sunData.englishName,
      color: sunData.color,
      size: sunData.size,
      orbitRadius: 0,
      orbitSpeed: 0,
      diameter: sunData.diameter,
      distanceFromSun: 0,
      orbitalPeriod: 0,
      description: sunData.description
    })
  }

  return (
    <group>
      <mesh ref={sunRef} onClick={handleSunClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[sunData.size, 32, 32]} />
        <meshBasicMaterial color={sunData.color} />
      </mesh>

      <sprite scale={[sunData.size * 6, sunData.size * 6, 1]}>
        <spriteMaterial
          map={sunGlowTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <pointLight color={sunData.color} intensity={2} distance={100} decay={2} />

      {orbitRadii.map((radius, index) => (
        <mesh key={`orbit-${index}`} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.01, 8, 128]} />
          <meshBasicMaterial color="#4a5568" transparent opacity={0.3} />
        </mesh>
      ))}

      {planetsData.map((planet, index) => (
        <Planet
          key={planet.id}
          data={planet}
          position={getPlanetPosition(index)}
          onClick={onPlanetClick}
          speedMultiplier={speedMultiplier}
        />
      ))}

      <ambientLight intensity={0.15} />
    </group>
  )
}
