import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EARTH_RADIUS } from '../types'

export function Clouds() {
  const meshRef = useRef<THREE.Mesh>(null)

  const cloudTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = 'rgba(0, 0, 0, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const w = 40 + Math.random() * 150
      const h = 20 + Math.random() * 60

      const cloudGradient = ctx.createRadialGradient(
        x + w / 2, y + h / 2, 0,
        x + w / 2, y + h / 2, Math.max(w, h) / 2
      )
      const alpha = 0.15 + Math.random() * 0.25
      cloudGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
      cloudGradient.addColorStop(0.6, `rgba(255, 255, 255, ${alpha * 0.5})`)
      cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.fillStyle = cloudGradient
      ctx.beginPath()
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    return texture
  }, [])

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.02
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[EARTH_RADIUS * 1.01, 64, 64]} />
      <meshPhongMaterial
        map={cloudTexture}
        transparent={true}
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  )
}
