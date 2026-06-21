import { useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { AltitudeLevel, WindFieldManager } from '../wind/WindFieldManager'
import { SelectedPointInfo } from '../components/InfoPanel'

interface EarthProps {
  windManager: WindFieldManager
  altitudeLevel: AltitudeLevel
  onPointSelect: (info: SelectedPointInfo | null) => void
  selectedPosition: { lat: number; lon: number } | null
}

function generateEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#1a365d')
  gradient.addColorStop(0.3, '#2c5282')
  gradient.addColorStop(0.5, '#3182ce')
  gradient.addColorStop(0.7, '#2c5282')
  gradient.addColorStop(1, '#1a365d')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const continents = [
    { x: 180, y: 150, rx: 120, ry: 80, color: '#2d3748' },
    { x: 500, y: 180, rx: 150, ry: 100, color: '#2d3748' },
    { x: 750, y: 200, rx: 100, ry: 120, color: '#2d3748' },
    { x: 300, y: 380, rx: 200, ry: 60, color: '#2d3748' },
    { x: 850, y: 350, rx: 80, ry: 50, color: '#2d3748' },
    { x: 150, y: 320, rx: 60, ry: 80, color: '#2d3748' },
    { x: 650, y: 100, rx: 70, ry: 40, color: '#4a5568' },
    { x: 400, y: 80, rx: 50, ry: 30, color: '#4a5568' },
    { x: 300, y: 250, rx: 30, ry: 50, color: '#3d4852' },
    { x: 600, y: 280, rx: 40, ry: 60, color: '#3d4852' },
    { x: 900, y: 150, rx: 40, ry: 30, color: '#4a5568' }
  ]

  continents.forEach(cont => {
    ctx.beginPath()
    ctx.ellipse(cont.x, cont.y, cont.rx, cont.ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = cont.color
    ctx.fill()
  })

  ctx.strokeStyle = 'rgba(72, 187, 120, 0.3)'
  ctx.lineWidth = 1
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * canvas.height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(72, 187, 120, 0.2)'
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * canvas.width
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function SelectionMarker({ position }: { position: THREE.Vector3 }) {
  const ringRef = useRef<THREE.Mesh>(null)
  const innerRingRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.02
      ringRef.current.lookAt(new THREE.Vector3(0, 0, 0))
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= 0.03
      innerRingRef.current.lookAt(new THREE.Vector3(0, 0, 0))
    }
  })

  const normal = position.clone().normalize()
  const up = new THREE.Vector3(0, 1, 0)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal)

  return (
    <group position={position} quaternion={quaternion}>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.025, 0.003, 8, 32]} />
        <meshBasicMaterial color="#e53e3e" transparent opacity={0.9} />
      </mesh>
      <mesh ref={innerRingRef}>
        <torusGeometry args={[0.015, 0.002, 8, 24]} />
        <meshBasicMaterial color="#fc8181" transparent opacity={0.7} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.008, 16, 16]} />
        <meshBasicMaterial color="#e53e3e" />
      </mesh>
    </group>
  )
}

export function Earth({ windManager, altitudeLevel, onPointSelect, selectedPosition }: EarthProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera, raycaster, gl } = useThree()
  const [hovered, setHovered] = useState(false)

  const texture = useMemo(() => generateEarthTexture(), [])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002
    }
  })

  const handleClick = (event: any) => {
    event.stopPropagation()

    const point = event.point
    const normalized = point.clone().normalize()

    const lat = 90 - Math.acos(normalized.y) * (180 / Math.PI)
    const lon = Math.atan2(normalized.z, normalized.x) * (180 / Math.PI)

    const windData = windManager.getWindAtLatLon(lat, lon, altitudeLevel)

    onPointSelect({
      latitude: Math.round(lat * 10) / 10,
      longitude: Math.round(lon * 10) / 10,
      windSpeed: Math.round(windData.speed * 10) / 10,
      windDirection: Math.round(windData.direction * 10) / 10,
      altitudeLevel: altitudeLevel
    })
  }

  const handlePointerOver = () => {
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    setHovered(false)
    document.body.style.cursor = 'default'
  }

  const selectedWorldPos = useMemo(() => {
    if (!selectedPosition) return null

    const phi = (90 - selectedPosition.lat) * (Math.PI / 180)
    const theta = selectedPosition.lon * (Math.PI / 180)

    const x = Math.sin(phi) * Math.cos(theta)
    const y = Math.cos(phi)
    const z = Math.sin(phi) * Math.sin(theta)

    return new THREE.Vector3(x, y, z)
  }, [selectedPosition])

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.002, 64, 64]} />
        <meshBasicMaterial
          color="#4299e1"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {selectedWorldPos && <SelectionMarker position={selectedWorldPos} />}
    </group>
  )
}
