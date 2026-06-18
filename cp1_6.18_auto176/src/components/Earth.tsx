import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EARTH_RADIUS } from '../types'

export function Earth() {
  const meshRef = useRef<THREE.Mesh>(null)

  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#1a3a5c')
    gradient.addColorStop(0.3, '#1e4d6b')
    gradient.addColorStop(0.5, '#2d5a7b')
    gradient.addColorStop(0.7, '#1e4d6b')
    gradient.addColorStop(1, '#1a3a5c')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < 80; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const w = 80 + Math.random() * 300
      const h = 40 + Math.random() * 150

      const landGradient = ctx.createRadialGradient(
        x + w / 2, y + h / 2, 0,
        x + w / 2, y + h / 2, Math.max(w, h) / 2
      )
      const green = Math.floor(80 + Math.random() * 60)
      landGradient.addColorStop(0, `rgb(${60 + Math.random() * 30}, ${green}, ${40 + Math.random() * 30})`)
      landGradient.addColorStop(0.7, `rgb(${50 + Math.random() * 20}, ${green - 10}, ${30 + Math.random() * 20})`)
      landGradient.addColorStop(1, 'rgba(50, 80, 40, 0)')

      ctx.fillStyle = landGradient
      ctx.beginPath()
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * canvas.width
      const y = 50 + Math.random() * (canvas.height - 100)
      const r = 20 + Math.random() * 60

      const desertGradient = ctx.createRadialGradient(x, y, 0, x, y, r)
      desertGradient.addColorStop(0, `rgb(${180 + Math.random() * 40}, ${150 + Math.random() * 30}, ${80 + Math.random() * 30})`)
      desertGradient.addColorStop(1, 'rgba(180, 150, 80, 0)')

      ctx.fillStyle = desertGradient
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const iceGradient = ctx.createLinearGradient(0, 0, 0, 100)
    iceGradient.addColorStop(0, 'rgba(220, 235, 255, 0.9)')
    iceGradient.addColorStop(1, 'rgba(200, 220, 245, 0)')
    ctx.fillStyle = iceGradient
    ctx.fillRect(0, 0, canvas.width, 100)

    const iceGradient2 = ctx.createLinearGradient(0, canvas.height - 100, 0, canvas.height)
    iceGradient2.addColorStop(0, 'rgba(200, 220, 245, 0)')
    iceGradient2.addColorStop(1, 'rgba(220, 235, 255, 0.9)')
    ctx.fillStyle = iceGradient2
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    return texture
  }, [])

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[EARTH_RADIUS, 128, 128]} />
      <meshPhongMaterial
        map={earthTexture}
        specular={new THREE.Color(0x333333)}
        shininess={5}
      />
    </mesh>
  )
}
