import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { TagData } from '../types'
import { coldToHotGradient } from '../utils'

interface TagCloudProps {
  tags: TagData[]
}

function TagCloud({ tags }: TagCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const tagsRef = useRef<{ mesh: THREE.Mesh; velocity: THREE.Vector3; originalPos: THREE.Vector3 }[]>([])
  const animationRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!containerRef.current || tags.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.z = 300
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const createTagTexture = (text: string, size: number, color: string) => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      
      const fontSize = Math.floor(size * 0.6)
      canvas.width = 512
      canvas.height = 128
      
      context.clearRect(0, 0, canvas.width, canvas.height)
      
      context.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillStyle = color
      context.shadowColor = 'rgba(0, 0, 0, 0.5)'
      context.shadowBlur = 4
      context.fillText(text, canvas.width / 2, canvas.height / 2)

      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true
      return texture
    }

    const tagObjects: { mesh: THREE.Mesh; velocity: THREE.Vector3; originalPos: THREE.Vector3 }[] = []
    const radius = Math.min(width, height) * 0.35

    tags.forEach((tag, index) => {
      const phi = Math.acos(-1 + (2 * index) / tags.length)
      const theta = Math.sqrt(tags.length * Math.PI) * phi

      const x = radius * Math.cos(theta) * Math.sin(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      const z = radius * Math.cos(phi)

      const baseSize = 20
      const tagSize = baseSize + tag.weight * 40
      const color = coldToHotGradient(tag.weight)

      const texture = createTagTexture(tag.name, tagSize, color)
      
      const material = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        depthTest: false,
      })
      
      const sprite = new THREE.Sprite(material)
      sprite.position.set(x, y, z)
      
      const scaleX = tagSize * 3
      const scaleY = tagSize * 0.8
      sprite.scale.set(scaleX, scaleY, 1)

      scene.add(sprite)

      tagObjects.push({
        mesh: sprite as unknown as THREE.Mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        originalPos: new THREE.Vector3(x, y, z),
      })
    })

    tagsRef.current = tagObjects

    const particleGeometry = new THREE.BufferGeometry()
    const particleCount = 100
    const positions = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * radius * 2.5
      positions[i + 1] = (Math.random() - 0.5) * radius * 2.5
      positions[i + 2] = (Math.random() - 0.5) * radius * 2.5
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x805ad5,
      size: 2,
      transparent: true,
      opacity: 0.3,
    })
    
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    let lastTime = performance.now()
    let rotationY = 0
    let rotationX = 0

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      
      const currentTime = performance.now()
      const delta = (currentTime - lastTime) / 16.67
      lastTime = currentTime

      rotationY += 0.003 * delta
      rotationX += mouseRef.current.y * 0.001 * delta

      tagObjects.forEach((tag, index) => {
        const pos = tag.mesh.position
        const orig = tag.originalPos

        const time = currentTime * 0.001
        const floatOffset = Math.sin(time + index * 0.5) * 5

        const targetX = orig.x * Math.cos(rotationY) - orig.z * Math.sin(rotationY)
        const targetZ = orig.x * Math.sin(rotationY) + orig.z * Math.cos(rotationY)
        const targetY = orig.y + floatOffset + rotationX * 50

        pos.x += (targetX - pos.x) * 0.05 * delta
        pos.y += (targetY - pos.y) * 0.05 * delta
        pos.z += (targetZ - pos.z) * 0.05 * delta

        const dist = pos.length()
        const scale = 0.6 + (dist / (radius * 1.5)) * 0.8
        const material = (tag.mesh as unknown as THREE.Sprite).material as THREE.SpriteMaterial
        material.opacity = Math.max(0.3, scale)
      })

      particles.rotation.y += 0.001 * delta
      particles.rotation.x += 0.0005 * delta

      renderer.render(scene, camera)
    }

    animate()

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseRef.current = {
        x: ((e.clientX - rect.left) / width) * 2 - 1,
        y: -((e.clientY - rect.top) / height) * 2 + 1,
      }
    }

    container.addEventListener('mousemove', handleMouseMove)

    const handleResize = () => {
      if (!containerRef.current) return
      const newWidth = containerRef.current.clientWidth
      const newHeight = containerRef.current.clientHeight
      
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('mousemove', handleMouseMove)
      
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      
      renderer.dispose()
    }
  }, [tags])

  return (
    <div 
      ref={containerRef} 
      className="tag-cloud-container"
    />
  )
}

export default TagCloud
