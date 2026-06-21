import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ButterflySwarmProps {
  gestureValue: number
  maxButterflies?: number
}

class SimplexNoise {
  private perm: number[]

  constructor(seed: number = Math.random()) {
    this.perm = []
    const p: number[] = []
    for (let i = 0; i < 256; i++) {
      p[i] = Math.floor(seed * 256)
      seed = (seed * 16807) % 2147483647
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255]
    }
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)

    const u = this.fade(xf)
    const v = this.fade(yf)

    const aa = this.perm[this.perm[X] + Y]
    const ab = this.perm[this.perm[X] + Y + 1]
    const ba = this.perm[this.perm[X + 1] + Y]
    const bb = this.perm[this.perm[X + 1] + Y + 1]

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u)
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u)

    return this.lerp(x1, x2, v)
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }
}

function createButterflyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 120)
  gradient.addColorStop(0, 'rgba(255, 182, 255, 0.9)')
  gradient.addColorStop(0.3, 'rgba(186, 85, 211, 0.8)')
  gradient.addColorStop(0.6, 'rgba(138, 43, 226, 0.7)')
  gradient.addColorStop(0.8, 'rgba(75, 0, 130, 0.5)')
  gradient.addColorStop(1, 'rgba(30, 10, 60, 0)')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(128, 128)
  ctx.quadraticCurveTo(80, 40, 30, 80)
  ctx.quadraticCurveTo(10, 140, 60, 180)
  ctx.quadraticCurveTo(100, 220, 128, 160)
  ctx.quadraticCurveTo(156, 220, 196, 180)
  ctx.quadraticCurveTo(246, 140, 226, 80)
  ctx.quadraticCurveTo(176, 40, 128, 128)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(128, 128)
    const r = 80 + Math.sin(angle * 2) * 20
    ctx.lineTo(128 + Math.cos(angle) * r, 128 + Math.sin(angle) * r * 0.6)
    ctx.stroke()
  }

  const bodyGradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 15)
  bodyGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
  bodyGradient.addColorStop(0.5, 'rgba(200, 200, 255, 0.7)')
  bodyGradient.addColorStop(1, 'rgba(100, 100, 200, 0)')
  ctx.fillStyle = bodyGradient
  ctx.beginPath()
  ctx.ellipse(128, 128, 8, 30, 0, 0, Math.PI * 2)
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

interface ButterflyData {
  group: THREE.Group
  leftWing: THREE.Mesh
  rightWing: THREE.Mesh
  baseAngle: number
  baseRadius: number
  heightOffset: number
  speed: number
  phase: number
  noiseOffset: number
  color: THREE.Color
}

export default function ButterflySwarm({ 
  gestureValue,
  maxButterflies = 80
}: ButterflySwarmProps) {
  const groupRef = useRef<THREE.Group>(null)
  const butterfliesRef = useRef<ButterflyData[]>([])
  const noiseGen = useMemo(() => new SimplexNoise(42), [])
  const timeRef = useRef(0)
  const [butterflyTexture, setButterflyTexture] = useState<THREE.CanvasTexture | null>(null)
  const targetCountRef = useRef(20)
  const currentCountRef = useRef(20)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const texture = createButterflyTexture()
    setButterflyTexture(texture)
  }, [])

  useEffect(() => {
    targetCountRef.current = Math.floor(10 + gestureValue * 70)
  }, [gestureValue])

  useEffect(() => {
    if (!butterflyTexture || !groupRef.current || initialized) return

    const butterflies: ButterflyData[] = []

    for (let i = 0; i < maxButterflies; i++) {
      const group = new THREE.Group()

      const wingGeometry = new THREE.PlaneGeometry(0.8, 0.6)
      
      const leftWingMaterial = new THREE.MeshBasicMaterial({
        map: butterflyTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
      
      const rightWingMaterial = new THREE.MeshBasicMaterial({
        map: butterflyTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })

      const leftWing = new THREE.Mesh(wingGeometry, leftWingMaterial)
      leftWing.position.x = -0.4
      leftWing.rotation.y = 0.3

      const rightWing = new THREE.Mesh(wingGeometry, rightWingMaterial)
      rightWing.position.x = 0.4
      rightWing.rotation.y = -0.3

      group.add(leftWing)
      group.add(rightWing)

      const hue = (i / maxButterflies * 0.3 + 0.7) % 1
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6)
      leftWingMaterial.color.copy(color)
      rightWingMaterial.color.copy(color)

      const baseAngle = Math.random() * Math.PI * 2
      const baseRadius = 2 + Math.random() * 3
      const heightOffset = (Math.random() - 0.5) * 2
      const speed = 0.3 + Math.random() * 0.5
      const phase = Math.random() * Math.PI * 2
      const noiseOffset = Math.random() * 1000

      group.visible = i < 20

      butterflies.push({
        group,
        leftWing,
        rightWing,
        baseAngle,
        baseRadius,
        heightOffset,
        speed,
        phase,
        noiseOffset,
        color
      })

      groupRef.current!.add(group)
    }

    butterfliesRef.current = butterflies
    setInitialized(true)
  }, [butterflyTexture, maxButterflies, initialized])

  useFrame((_, delta) => {
    if (!groupRef.current || !initialized) return

    timeRef.current += delta

    const targetCount = targetCountRef.current
    if (currentCountRef.current < targetCount) {
      currentCountRef.current = Math.min(targetCount, currentCountRef.current + 0.5)
    } else if (currentCountRef.current > targetCount) {
      currentCountRef.current = Math.max(targetCount, currentCountRef.current - 0.5)
    }

    const activeCount = Math.floor(currentCountRef.current)
    const fadeCount = currentCountRef.current - activeCount

    const targetRadius = 2 + gestureValue * 8
    const targetFlapFreq = 0.5 + gestureValue * 2.5
    const targetSpeed = 0.2 + gestureValue * 0.6
    const spiralExpansion = gestureValue

    for (let i = 0; i < butterfliesRef.current.length; i++) {
      const b = butterfliesRef.current[i]
      const isActive = i < activeCount
      const isFading = i === activeCount && fadeCount > 0

      if (!isActive && !isFading) {
        b.group.visible = false
        continue
      }

      b.group.visible = true

      const alpha = isFading ? fadeCount : 1
      const leftMat = b.leftWing.material as THREE.MeshBasicMaterial
      const rightMat = b.rightWing.material as THREE.MeshBasicMaterial
      leftMat.opacity = alpha * 0.8
      rightMat.opacity = alpha * 0.8

      const t = timeRef.current * b.speed * targetSpeed + b.phase
      const noiseX = noiseGen.noise2D(t * 0.5 + b.noiseOffset, b.noiseOffset)
      const noiseY = noiseGen.noise2D(b.noiseOffset, t * 0.5 + b.noiseOffset)
      const noiseZ = noiseGen.noise2D(t * 0.3 + b.noiseOffset, b.noiseOffset + 100)

      const spiralAngle = t + b.baseAngle + noiseX * 0.5
      const radius = b.baseRadius * (1 + spiralExpansion * 2) + noiseZ * targetRadius * 0.3
      const height = b.heightOffset + Math.sin(t * 0.7 + b.phase) * 1.5 + noiseY * 2

      const x = Math.cos(spiralAngle) * radius
      const z = Math.sin(spiralAngle) * radius
      const y = height

      b.group.position.set(x, y, z)

      const lookAhead = t + 0.1
      const nextRadius = b.baseRadius * (1 + spiralExpansion * 2) + noiseGen.noise2D(lookAhead * 0.3 + b.noiseOffset, b.noiseOffset + 100) * targetRadius * 0.3
      const nextX = Math.cos(lookAhead + b.baseAngle + noiseX * 0.5) * nextRadius
      const nextZ = Math.sin(lookAhead + b.baseAngle + noiseX * 0.5) * nextRadius

      const dir = new THREE.Vector3(nextX - x, 0, nextZ - z)
      if (dir.length() > 0.001) {
        dir.normalize()
        b.group.lookAt(new THREE.Vector3(x + dir.x, y, z + dir.z))
        b.group.rotateY(Math.PI / 2)
      }

      const flapAngle = Math.sin(t * targetFlapFreq * Math.PI * 2)
      const maxFlap = Math.PI / 3
      b.leftWing.rotation.y = 0.3 + flapAngle * maxFlap
      b.rightWing.rotation.y = -0.3 - flapAngle * maxFlap

      const bob = Math.sin(t * 2 + b.phase) * 0.1
      b.group.position.y += bob
    }
  })

  return <group ref={groupRef} />
}
