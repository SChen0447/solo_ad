import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { ParticleEngine } from './particleEngine'
import { PhysicsEngine } from './physicsEngine'
import { GraphManager } from './graphManager'
import { Recorder, type SceneSnapshot, type SceneParams } from './recorder'
import { ControlPanel } from './controlPanel'
import type { Particle } from './particleEngine'
import type { BurstParticle } from './physicsEngine'

const NebulaCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const animationIdRef = useRef<number>(0)
  const clockRef = useRef<THREE.Clock>(new THREE.Clock())

  const particleEngineRef = useRef<ParticleEngine>(new ParticleEngine())
  const physicsEngineRef = useRef<PhysicsEngine>(new PhysicsEngine())
  const graphManagerRef = useRef<GraphManager>(new GraphManager())
  const recorderRef = useRef<Recorder>(new Recorder())

  const particlesRef = useRef<THREE.Points | null>(null)
  const proximityLinesRef = useRef<THREE.LineSegments | null>(null)
  const connectionLinesRef = useRef<THREE.Group | null>(null)
  const dragLineRef = useRef<THREE.Line | null>(null)
  const gravityPointMeshRef = useRef<THREE.Mesh | null>(null)
  const burstParticlesRef = useRef<THREE.Points | null>(null)
  const flowLightsRef = useRef<THREE.Group | null>(null)

  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const isDraggingGravityRef = useRef<boolean>(false)
  const isDraggingConnectionRef = useRef<boolean>(false)
  const selectedParticleIdRef = useRef<string | null>(null)

  const [particleCount, setParticleCount] = useState(300)
  const [particleSize, setParticleSize] = useState(1.25)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [colorTheme, setColorTheme] = useState('aurora')
  const [gravityStrength, setGravityStrength] = useState(1)
  const [gravityPointColor, setGravityPointColor] = useState('#ffffff')

  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'playing'>('idle')
  const [recordProgress, setRecordProgress] = useState(0)
  const [playbackProgress, setPlaybackProgress] = useState(0)
  const [hasRecording, setHasRecording] = useState(false)

  const [smoothedParticleCount, setSmoothedParticleCount] = useState(300)
  const [smoothedParticleSize, setSmoothedParticleSize] = useState(1.25)
  const [smoothedSpeedMultiplier, setSmoothedSpeedMultiplier] = useState(1)
  const [smoothedGravityStrength, setSmoothedGravityStrength] = useState(1)

  const getCurrentParams = useCallback((): SceneParams => ({
    particleCount,
    particleSize,
    speedMultiplier,
    colorTheme,
    gravityStrength,
    gravityPointColor
  }), [particleCount, particleSize, speedMultiplier, colorTheme, gravityStrength, gravityPointColor])

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0a0a1a')
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 5, 25)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0x6366f1, 2, 50)
    pointLight.position.set(10, 10, 10)
    scene.add(pointLight)

    particleEngineRef.current.init(300)
    createParticlesMesh()
    createProximityLines()
    createConnectionLines()
    createDragLine()
    createGravityPoint()
    createBurstParticles()
    createFlowLights()

    recorderRef.current.onStatusChange((status) => {
      setRecordingStatus(status)
      if (status === 'idle') {
        setHasRecording(recorderRef.current.hasRecording())
      }
    })

    graphManagerRef.current.onConnection(() => {
      updateConnectionLines()
    })

    animate()

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationIdRef.current)
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
    }
  }, [])

  const createParticlesMesh = () => {
    if (!sceneRef.current) return

    const particles = particleEngineRef.current.getParticles()
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particles.length * 3)
    const colors = new Float32Array(particles.length * 3)
    const sizes = new Float32Array(particles.length)

    particles.forEach((p, i) => {
      positions[i * 3] = p.position.x
      positions[i * 3 + 1] = p.position.y
      positions[i * 3 + 2] = p.position.z
      colors[i * 3] = p.color.r
      colors[i * 3 + 1] = p.color.g
      colors[i * 3 + 2] = p.color.b
      sizes[i] = p.size
    })

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })

    const points = new THREE.Points(geometry, material)
    sceneRef.current.add(points)
    particlesRef.current = points
  }

  const createProximityLines = () => {
    if (!sceneRef.current) return

    const geometry = new THREE.BufferGeometry()
    const material = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    })

    const lines = new THREE.LineSegments(geometry, material)
    sceneRef.current.add(lines)
    proximityLinesRef.current = lines
  }

  const createConnectionLines = () => {
    if (!sceneRef.current) return
    const group = new THREE.Group()
    sceneRef.current.add(group)
    connectionLinesRef.current = group
  }

  const createDragLine = () => {
    if (!sceneRef.current) return

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(2 * 3)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.LineBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    })

    const line = new THREE.Line(geometry, material)
    line.visible = false
    sceneRef.current.add(line)
    dragLineRef.current = line
  }

  const createGravityPoint = () => {
    if (!sceneRef.current) return

    const geometry = new THREE.SphereGeometry(0.75, 32, 32)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(0, 0, 0)

    const glowGeometry = new THREE.SphereGeometry(1.5, 32, 32)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    mesh.add(glow)

    sceneRef.current.add(mesh)
    gravityPointMeshRef.current = mesh
    physicsEngineRef.current.setGravityPoint(mesh.position)
  }

  const createBurstParticles = () => {
    if (!sceneRef.current) return

    const geometry = new THREE.BufferGeometry()
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    })

    const points = new THREE.Points(geometry, material)
    sceneRef.current.add(points)
    burstParticlesRef.current = points
  }

  const createFlowLights = () => {
    if (!sceneRef.current) return
    const group = new THREE.Group()
    sceneRef.current.add(group)
    flowLightsRef.current = group
  }

  const updateParticlesMesh = (particles: Particle[]) => {
    if (!particlesRef.current) return

    const geometry = particlesRef.current.geometry
    const positions = geometry.attributes.position.array as Float32Array
    const colors = geometry.attributes.color.array as Float32Array
    const sizes = geometry.attributes.size.array as Float32Array

    const targetCount = particles.length
    const currentCount = positions.length / 3

    if (targetCount !== currentCount) {
      const newPositions = new Float32Array(targetCount * 3)
      const newColors = new Float32Array(targetCount * 3)
      const newSizes = new Float32Array(targetCount)

      const copyCount = Math.min(currentCount, targetCount)
      newPositions.set(positions.slice(0, copyCount * 3))
      newColors.set(colors.slice(0, copyCount * 3))
      newSizes.set(sizes.slice(0, copyCount))

      geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3))
      geometry.setAttribute('size', new THREE.BufferAttribute(newSizes, 1))
    }

    const posArr = geometry.attributes.position.array as Float32Array
    const colArr = geometry.attributes.color.array as Float32Array
    const sizeArr = geometry.attributes.size.array as Float32Array

    particles.forEach((p, i) => {
      posArr[i * 3] = p.position.x
      posArr[i * 3 + 1] = p.position.y
      posArr[i * 3 + 2] = p.position.z
      colArr[i * 3] = p.color.r
      colArr[i * 3 + 1] = p.color.g
      colArr[i * 3 + 2] = p.color.b
      sizeArr[i] = p.size
    })

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    geometry.attributes.size.needsUpdate = true
  }

  const updateProximityLines = (particles: Particle[]) => {
    if (!proximityLinesRef.current) return

    const connections = graphManagerRef.current.getProximityConnections(particles, 5)
    const positions = new Float32Array(connections.length * 2 * 3)
    const colors = new Float32Array(connections.length * 2 * 3)

    connections.forEach((conn, i) => {
      const alpha = 1 - conn.distance / 5
      const color = conn.particleA.color.clone().lerp(conn.particleB.color, 0.5)

      positions[i * 6] = conn.particleA.position.x
      positions[i * 6 + 1] = conn.particleA.position.y
      positions[i * 6 + 2] = conn.particleA.position.z
      positions[i * 6 + 3] = conn.particleB.position.x
      positions[i * 6 + 4] = conn.particleB.position.y
      positions[i * 6 + 5] = conn.particleB.position.z

      colors[i * 6] = color.r * alpha
      colors[i * 6 + 1] = color.g * alpha
      colors[i * 6 + 2] = color.b * alpha
      colors[i * 6 + 3] = color.r * alpha
      colors[i * 6 + 4] = color.g * alpha
      colors[i * 6 + 5] = color.b * alpha
    })

    const geometry = proximityLinesRef.current.geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    ;(proximityLinesRef.current.material as THREE.LineBasicMaterial).vertexColors = true
  }

  const updateConnectionLines = () => {
    if (!connectionLinesRef.current || !sceneRef.current) return

    while (connectionLinesRef.current.children.length > 0) {
      const child = connectionLinesRef.current.children[0]
      connectionLinesRef.current.remove(child)
      if (child instanceof THREE.Line) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    }

    const connections = graphManagerRef.current.getAllConnections()
    const particles = particleEngineRef.current.getParticles()

    connections.forEach(conn => {
      const particleA = particles.find(p => p.id === conn.particleAId)
      const particleB = particles.find(p => p.id === conn.particleBId)
      if (!particleA || !particleB) return

      const points = graphManagerRef.current.getArcPoints(particleA, particleB, 30)
      const geometry = new THREE.BufferGeometry().setFromPoints(points)

      const isEnhanced = physicsEngineRef.current.isConnectionEnhanced(particleA, particleB)
      const pulse = physicsEngineRef.current.getConnectionPulse()

      const baseColor = particleA.color.clone().lerp(particleB.color, 0.5)
      const opacity = isEnhanced ? 0.6 + pulse * 0.3 : 0.5
      const lineWidth = isEnhanced ? 2 + pulse : 1.5

      const material = new THREE.LineBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        linewidth: lineWidth
      })

      const line = new THREE.Line(geometry, material)
      connectionLinesRef.current!.add(line)
    })
  }

  const updateBurstParticles = (burstParticles: BurstParticle[]) => {
    if (!burstParticlesRef.current) return

    const positions = new Float32Array(burstParticles.length * 3)
    const colors = new Float32Array(burstParticles.length * 3)
    const sizes = new Float32Array(burstParticles.length)

    burstParticles.forEach((bp, i) => {
      const alpha = bp.life / bp.maxLife
      positions[i * 3] = bp.position.x
      positions[i * 3 + 1] = bp.position.y
      positions[i * 3 + 2] = bp.position.z
      colors[i * 3] = bp.color.r * alpha
      colors[i * 3 + 1] = bp.color.g * alpha
      colors[i * 3 + 2] = bp.color.b * alpha
      sizes[i] = bp.size * alpha
    })

    const geometry = burstParticlesRef.current.geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    geometry.attributes.size.needsUpdate = true
  }

  const updateFlowLights = () => {
    if (!flowLightsRef.current) return

    while (flowLightsRef.current.children.length > 0) {
      const child = flowLightsRef.current.children[0]
      flowLightsRef.current.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    }

    const connections = graphManagerRef.current.getAllConnections()
    const particles = particleEngineRef.current.getParticles()

    connections.forEach(conn => {
      const particleA = particles.find(p => p.id === conn.particleAId)
      const particleB = particles.find(p => p.id === conn.particleBId)
      if (!particleA || !particleB) return

      const position = graphManagerRef.current.getFlowLightPosition(particleA, particleB)
      const geometry = new THREE.SphereGeometry(0.2, 8, 8)
      const color = particleA.color.clone().lerp(particleB.color, 0.5)
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(position)
      flowLightsRef.current!.add(mesh)
    })
  }

  const updateDragLine = () => {
    if (!dragLineRef.current) return

    const dragState = graphManagerRef.current.getDragState()
    if (!dragState.isDragging || !dragState.dragStartPosition || !dragState.dragCurrentPosition) {
      dragLineRef.current.visible = false
      return
    }

    dragLineRef.current.visible = true
    const positions = dragLineRef.current.geometry.attributes.position.array as Float32Array
    positions[0] = dragState.dragStartPosition.x
    positions[1] = dragState.dragStartPosition.y
    positions[2] = dragState.dragStartPosition.z
    positions[3] = dragState.dragCurrentPosition.x
    positions[4] = dragState.dragCurrentPosition.y
    positions[5] = dragState.dragCurrentPosition.z
    dragLineRef.current.geometry.attributes.position.needsUpdate = true
  }

  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return

    animationIdRef.current = requestAnimationFrame(animate)

    const deltaTime = clockRef.current.getDelta()

    const gravityPoint = physicsEngineRef.current.getGravityPoint()
    const gravityStr = physicsEngineRef.current.getGravityStrength()

    particleEngineRef.current.setSpeedMultiplier(smoothedSpeedMultiplier)
    const particles = particleEngineRef.current.update(deltaTime, gravityPoint, gravityStr)

    const connections = graphManagerRef.current.getAllConnections().map(conn => {
      const particleA = particles.find(p => p.id === conn.particleAId)
      const particleB = particles.find(p => p.id === conn.particleBId)
      return { particleA: particleA!, particleB: particleB! }
    }).filter(c => c.particleA && c.particleB)

    const burstParticles = physicsEngineRef.current.update(particles, deltaTime, connections)

    updateParticlesMesh(particles)
    updateProximityLines(particles)
    updateConnectionLines()
    updateBurstParticles(burstParticles)
    updateFlowLights()
    updateDragLine()

    if (gravityPointMeshRef.current) {
      const pulse = 0.75 + 0.1 * Math.sin(performance.now() * 0.002)
      gravityPointMeshRef.current.scale.setScalar(pulse)
    }

    const time = performance.now() * 0.0001
    if (cameraRef.current) {
      cameraRef.current.position.x = Math.sin(time) * 2
      cameraRef.current.position.z = 25 + Math.cos(time) * 2
      cameraRef.current.lookAt(0, 0, 0)
    }

    if (recorderRef.current.getStatus() === 'recording') {
      recorderRef.current.recordSnapshot(
        getCurrentParams(),
        physicsEngineRef.current.getGravityPoint(),
        graphManagerRef.current.getAllConnections()
      )
      setRecordProgress(recorderRef.current.getRecordProgress())
    }
    if (recorderRef.current.getStatus() === 'playing') {
      setPlaybackProgress(recorderRef.current.getPlaybackProgress())
    }

    const trailOpacity = recorderRef.current.getTrailOpacity()
    rendererRef.current.setClearColor(new THREE.Color('#0a0a1a'), 1 - trailOpacity)

    rendererRef.current.render(sceneRef.current, cameraRef.current)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setSmoothedParticleCount(prev => {
        const diff = particleCount - prev
        return prev + diff * 0.1
      })
      setSmoothedParticleSize(prev => {
        const diff = particleSize - prev
        return prev + diff * 0.1
      })
      setSmoothedSpeedMultiplier(prev => {
        const diff = speedMultiplier - prev
        return prev + diff * 0.1
      })
      setSmoothedGravityStrength(prev => {
        const diff = gravityStrength - prev
        return prev + diff * 0.1
      })
    }, 16)
    return () => clearInterval(interval)
  }, [particleCount, particleSize, speedMultiplier, gravityStrength])

  useEffect(() => {
    particleEngineRef.current.setParticleCount(Math.round(smoothedParticleCount))
  }, [smoothedParticleCount])

  useEffect(() => {
    particleEngineRef.current.setSizeRange(0.5, smoothedParticleSize)
  }, [smoothedParticleSize])

  useEffect(() => {
    particleEngineRef.current.setTheme(colorTheme)
  }, [colorTheme])

  useEffect(() => {
    physicsEngineRef.current.setGravityStrength(smoothedGravityStrength)
  }, [smoothedGravityStrength])

  useEffect(() => {
    if (gravityPointMeshRef.current) {
      const material = gravityPointMeshRef.current.material as THREE.MeshBasicMaterial
      material.color.set(gravityPointColor)
      if (gravityPointMeshRef.current.children[0]) {
        const glowMaterial = (gravityPointMeshRef.current.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial
        glowMaterial.color.set(gravityPointColor)
      }
      physicsEngineRef.current.setGravityPointColor(new THREE.Color(gravityPointColor))
    }
  }, [gravityPointColor])

  useEffect(() => {
    const unsub = recorderRef.current.onSnapshot((snapshot: SceneSnapshot) => {
      setParticleCount(snapshot.params.particleCount)
      setParticleSize(snapshot.params.particleSize)
      setSpeedMultiplier(snapshot.params.speedMultiplier)
      setColorTheme(snapshot.params.colorTheme)
      setGravityStrength(snapshot.params.gravityStrength)
      setGravityPointColor(snapshot.params.gravityPointColor)
      physicsEngineRef.current.setGravityPoint(
        new THREE.Vector3(snapshot.gravityPoint.x, snapshot.gravityPoint.y, snapshot.gravityPoint.z)
      )
      if (gravityPointMeshRef.current) {
        gravityPointMeshRef.current.position.set(
          snapshot.gravityPoint.x,
          snapshot.gravityPoint.y,
          snapshot.gravityPoint.z
        )
      }
      graphManagerRef.current.setConnections(snapshot.connections)
    })
    return unsub
  }, [getCurrentParams])

  const getMousePosition = (event: React.MouseEvent | MouseEvent): THREE.Vector2 => {
    if (!containerRef.current) return new THREE.Vector2()
    const rect = containerRef.current.getBoundingClientRect()
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )
  }

  const getIntersectionPoint = (mouse: THREE.Vector2): THREE.Vector3 | null => {
    if (!cameraRef.current || !sceneRef.current) return null

    raycasterRef.current.setFromCamera(mouse, cameraRef.current)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const intersection = new THREE.Vector3()
    raycasterRef.current.ray.intersectPlane(plane, intersection)
    return intersection
  }

  const findNearestParticle = (mouse: THREE.Vector2): Particle | null => {
    if (!cameraRef.current || !particlesRef.current) return null

    raycasterRef.current.setFromCamera(mouse, cameraRef.current)
    const intersects = raycasterRef.current.intersectObject(particlesRef.current)

    if (intersects.length === 0) return null

    const particles = particleEngineRef.current.getParticles()
    const index = intersects[0].index
    if (index === undefined) return null

    return particles[index] || null
  }

  const isGravityPointClicked = (mouse: THREE.Vector2): boolean => {
    if (!cameraRef.current || !gravityPointMeshRef.current) return false

    raycasterRef.current.setFromCamera(mouse, cameraRef.current)
    const intersects = raycasterRef.current.intersectObject(gravityPointMeshRef.current)
    return intersects.length > 0
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    if (recordingStatus === 'playing') return

    const mouse = getMousePosition(event)

    if (isGravityPointClicked(mouse)) {
      isDraggingGravityRef.current = true
      return
    }

    const particle = findNearestParticle(mouse)
    if (particle) {
      selectedParticleIdRef.current = particle.id
      particleEngineRef.current.selectParticle(particle.id)
      graphManagerRef.current.startDrag(particle.id, particle.position.clone())
      isDraggingConnectionRef.current = true
    } else {
      selectedParticleIdRef.current = null
      particleEngineRef.current.deselectAll()
    }
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    const mouse = getMousePosition(event)

    if (isDraggingGravityRef.current && gravityPointMeshRef.current) {
      const intersection = getIntersectionPoint(mouse)
      if (intersection) {
        gravityPointMeshRef.current.position.copy(intersection)
        physicsEngineRef.current.setGravityPoint(intersection)
      }
      return
    }

    if (isDraggingConnectionRef.current) {
      const intersection = getIntersectionPoint(mouse)
      if (intersection) {
        graphManagerRef.current.updateDrag(intersection, particleEngineRef.current.getParticles())
      }
    }
  }

  const handleMouseUp = () => {
    if (isDraggingGravityRef.current) {
      isDraggingGravityRef.current = false
      return
    }

    if (isDraggingConnectionRef.current) {
      const connection = graphManagerRef.current.endDrag()
      if (connection) {
        const particles = particleEngineRef.current.getParticles()
        const particleA = particles.find(p => p.id === connection.particleAId)
        const particleB = particles.find(p => p.id === connection.particleBId)
        if (particleA && particleB) {
          particleEngineRef.current.applyConnectionEffect(particleA, particleB)
        }
      }
      particleEngineRef.current.deselectAll()
      selectedParticleIdRef.current = null
      isDraggingConnectionRef.current = false
    }
  }

  const handleRecord = () => {
    if (recordingStatus === 'recording') {
      recorderRef.current.stopRecording()
    } else if (recordingStatus === 'idle') {
      recorderRef.current.startRecording(
        getCurrentParams(),
        physicsEngineRef.current.getGravityPoint(),
        graphManagerRef.current.getAllConnections()
      )
    }
  }

  const handlePlayback = () => {
    if (recordingStatus === 'idle' && recorderRef.current.hasRecording()) {
      recorderRef.current.startPlayback(
        getCurrentParams(),
        physicsEngineRef.current.getGravityPoint(),
        graphManagerRef.current.getAllConnections()
      )
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: recordingStatus === 'playing' ? 'default' : 'grab'
        }}
      />
      <ControlPanel
        particleCount={particleCount}
        onParticleCountChange={setParticleCount}
        particleSize={particleSize}
        onParticleSizeChange={setParticleSize}
        speedMultiplier={speedMultiplier}
        onSpeedMultiplierChange={setSpeedMultiplier}
        colorTheme={colorTheme}
        onColorThemeChange={setColorTheme}
        gravityStrength={gravityStrength}
        onGravityStrengthChange={setGravityStrength}
        gravityPointColor={gravityPointColor}
        onGravityPointColorChange={setGravityPointColor}
        recordingStatus={recordingStatus}
        recordProgress={recordProgress}
        playbackProgress={playbackProgress}
        hasRecording={hasRecording}
        onRecord={handleRecord}
        onPlayback={handlePlayback}
      />
    </div>
  )
}

export default NebulaCanvas
