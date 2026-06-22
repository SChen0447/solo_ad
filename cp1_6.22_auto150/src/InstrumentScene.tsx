import React, { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { HandData, HandLandmark } from './HandDetection'
import { AudioEngine } from './AudioEngine'

interface PianoKeyData {
  note: string
  midi: number
  type: 'white' | 'black'
  x: number
  width: number
  height: number
  isPressed: boolean
  targetY: number
  currentY: number
  velocity: number
  glowIntensity: number
  pressStartTime: number
}

interface InstrumentSceneProps {
  handData: HandData[]
  audioEngine: AudioEngine | null
  onNotePlay?: (midi: number, velocity: number) => void
  onNoteStop?: (midi: number) => void
}

const PIANO_NOTES = [
  { note: 'C2', midi: 48, type: 'white' as const },
  { note: 'C#2', midi: 49, type: 'black' as const },
  { note: 'D2', midi: 50, type: 'white' as const },
  { note: 'D#2', midi: 51, type: 'black' as const },
  { note: 'E2', midi: 52, type: 'white' as const },
  { note: 'F2', midi: 53, type: 'white' as const },
  { note: 'F#2', midi: 54, type: 'black' as const },
  { note: 'G2', midi: 55, type: 'white' as const },
  { note: 'G#2', midi: 56, type: 'black' as const },
  { note: 'A2', midi: 57, type: 'white' as const },
  { note: 'A#2', midi: 58, type: 'black' as const },
  { note: 'B2', midi: 59, type: 'white' as const },
  { note: 'C3', midi: 60, type: 'white' as const },
  { note: 'C#3', midi: 61, type: 'black' as const },
  { note: 'D3', midi: 62, type: 'white' as const },
  { note: 'D#3', midi: 63, type: 'black' as const },
  { note: 'E3', midi: 64, type: 'white' as const },
  { note: 'F3', midi: 65, type: 'white' as const },
  { note: 'F#3', midi: 66, type: 'black' as const },
  { note: 'G3', midi: 67, type: 'white' as const },
  { note: 'G#3', midi: 68, type: 'black' as const },
  { note: 'A3', midi: 69, type: 'white' as const },
  { note: 'A#3', midi: 70, type: 'black' as const },
  { note: 'B3', midi: 71, type: 'white' as const },
]

const WHITE_KEY_WIDTH = 60
const WHITE_KEY_HEIGHT = 200
const BLACK_KEY_WIDTH = 36
const BLACK_KEY_HEIGHT = 120
const KEY_DEPTH = 20
const PRESS_DEPTH = 8
const PRESS_THRESHOLD = 0.65
const RELEASE_THRESHOLD = 0.72
const STAY_DURATION = 150

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
]

const InstrumentScene: React.FC<InstrumentSceneProps> = ({ handData, audioEngine, onNotePlay, onNoteStop }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const keysRef = useRef<PianoKeyData[]>([])
  const keyMeshesRef = useRef<Map<number, { mesh: THREE.Mesh; glow: THREE.Mesh }>>(new Map())
  const handLinesRef = useRef<THREE.Line[]>([])
  const handPointsRef = useRef<THREE.Points[]>([])
  const fingerHoverRef = useRef<Map<number, { keyIndex: number; startTime: number }>>(new Map())
  const pressedKeysRef = useRef<Set<number>>(new Set())
  const animationFrameRef = useRef<number>(0)
  const sceneWidthRef = useRef(0)

  const createWoodTexture = useCallback((): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f5f5f0'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 80; i++) {
      ctx.strokeStyle = `rgba(200, 195, 180, ${Math.random() * 0.15})`
      ctx.lineWidth = Math.random() * 2 + 0.5
      ctx.beginPath()
      const y = Math.random() * 256
      ctx.moveTo(0, y)
      for (let x = 0; x < 256; x += 10) {
        ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3)
      }
      ctx.stroke()
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [])

  const initScene = useCallback(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    sceneRef.current = scene

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const mainLight = new THREE.SpotLight(0xffffff, 1.2, 0, Math.PI / 6, 0.3, 1)
    mainLight.position.set(0, 400, 300)
    mainLight.castShadow = true
    scene.add(mainLight)

    const fillLight = new THREE.PointLight(0x4ade80, 0.3, 800)
    fillLight.position.set(0, -50, 100)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3)
    rimLight.position.set(0, 200, -200)
    scene.add(rimLight)

    const width = window.innerWidth
    const height = window.innerHeight
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 350, 500)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = width
    bgCanvas.height = height
    const bgCtx = bgCanvas.getContext('2d')!
    const gradient = bgCtx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2)
    gradient.addColorStop(0, '#1a1a1a')
    gradient.addColorStop(0.5, '#0f0f0f')
    gradient.addColorStop(1, '#0a0a0a')
    bgCtx.fillStyle = gradient
    bgCtx.fillRect(0, 0, width, height)
    for (let i = 0; i < 2000; i++) {
      bgCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.03})`
      bgCtx.fillRect(Math.random() * width, Math.random() * height, 1, 1)
    }
    const bgTexture = new THREE.CanvasTexture(bgCanvas)
    scene.background = bgTexture

    const whiteKeys = PIANO_NOTES.filter(n => n.type === 'white')
    const totalWidth = whiteKeys.length * WHITE_KEY_WIDTH
    sceneWidthRef.current = totalWidth
    let whiteX = -totalWidth / 2 + WHITE_KEY_WIDTH / 2

    const woodTexture = createWoodTexture()

    const keys: PianoKeyData[] = []
    const blackKeysToAdd: PianoKeyData[] = []

    for (const noteData of PIANO_NOTES) {
      if (noteData.type === 'white') {
        const keyData: PianoKeyData = {
          ...noteData,
          x: whiteX,
          width: WHITE_KEY_WIDTH,
          height: WHITE_KEY_HEIGHT,
          isPressed: false,
          targetY: 0,
          currentY: 0,
          velocity: 0,
          glowIntensity: 0,
          pressStartTime: 0
        }
        keys.push(keyData)

        const geometry = new THREE.BoxGeometry(WHITE_KEY_WIDTH - 2, KEY_DEPTH, WHITE_KEY_HEIGHT)
        const material = new THREE.MeshStandardMaterial({
          map: woodTexture,
          color: 0xf5f5f0,
          roughness: 0.3,
          metalness: 0.1,
          transparent: true,
          opacity: 0.95
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(whiteX, 0, 0)
        mesh.castShadow = true
        mesh.receiveShadow = true
        scene.add(mesh)

        const glowGeometry = new THREE.BoxGeometry(WHITE_KEY_WIDTH - 4, 4, WHITE_KEY_HEIGHT - 10)
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x4ade80,
          transparent: true,
          opacity: 0
        })
        const glow = new THREE.Mesh(glowGeometry, glowMaterial)
        glow.position.set(whiteX, -KEY_DEPTH / 2 - 2, 0)
        scene.add(glow)

        keyMeshesRef.current.set(noteData.midi, { mesh, glow })
        whiteX += WHITE_KEY_WIDTH
      } else {
        const prevWhite = keys.filter(k => k.type === 'white').pop()!
        const blackX = prevWhite.x + WHITE_KEY_WIDTH / 2 - BLACK_KEY_WIDTH / 2
        
        const keyData: PianoKeyData = {
          ...noteData,
          x: blackX,
          width: BLACK_KEY_WIDTH,
          height: BLACK_KEY_HEIGHT,
          isPressed: false,
          targetY: 0,
          currentY: 0,
          velocity: 0,
          glowIntensity: 0,
          pressStartTime: 0
        }
        blackKeysToAdd.push(keyData)

        const geometry = new THREE.BoxGeometry(BLACK_KEY_WIDTH - 2, KEY_DEPTH, BLACK_KEY_HEIGHT)
        const material = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          roughness: 0.3,
          metalness: 0.1,
          transparent: true,
          opacity: 0.95
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(blackX, 2, BLACK_KEY_HEIGHT / 2 - WHITE_KEY_HEIGHT / 2 + 5)
        mesh.castShadow = true
        mesh.receiveShadow = true
        scene.add(mesh)

        const glowGeometry = new THREE.BoxGeometry(BLACK_KEY_WIDTH - 4, 4, BLACK_KEY_HEIGHT - 10)
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x4ade80,
          transparent: true,
          opacity: 0
        })
        const glow = new THREE.Mesh(glowGeometry, glowMaterial)
        glow.position.set(blackX, -KEY_DEPTH / 2 - 2, BLACK_KEY_HEIGHT / 2 - WHITE_KEY_HEIGHT / 2 + 5)
        scene.add(glow)

        keyMeshesRef.current.set(noteData.midi, { mesh, glow })
      }
    }

    keysRef.current = [...keys, ...blackKeysToAdd]

    for (let i = 0; i < 2; i++) {
      const lineGeometry = new THREE.BufferGeometry()
      const linePositions = new Float32Array(HAND_CONNECTIONS.length * 3 * 2)
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        linewidth: 2
      })
      const line = new THREE.LineSegments(lineGeometry, lineMaterial)
      line.position.z = 150
      line.visible = false
      scene.add(line)
      handLinesRef.current.push(line)

      const pointsGeometry = new THREE.BufferGeometry()
      const pointsPositions = new Float32Array(21 * 3)
      pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointsPositions, 3))
      const pointsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 4,
        transparent: true,
        opacity: 0.8
      })
      const points = new THREE.Points(pointsGeometry, pointsMaterial)
      points.position.z = 150
      points.visible = false
      scene.add(points)
      handPointsRef.current.push(points)
    }
  }, [createWoodTexture])

  const normalizeHandToScene = useCallback((landmark: HandLandmark): THREE.Vector3 => {
    const totalWidth = sceneWidthRef.current
    const sceneHeight = WHITE_KEY_HEIGHT
    
    const x = (landmark.x - 0.5) * totalWidth * 1.2
    const y = (0.5 - landmark.y) * sceneHeight * 1.5 + 100
    const z = 150
    
    return new THREE.Vector3(x, y, z)
  }, [])

  const getKeyAtPosition = useCallback((x: number, y: number): PianoKeyData | null => {
    const sortedKeys = [...keysRef.current].sort((a, b) => {
      if (a.type === 'black' && b.type === 'white') return -1
      if (a.type === 'white' && b.type === 'black') return 1
      return 0
    })

    for (const key of sortedKeys) {
      const halfWidth = key.width / 2
      const keyTopZ = key.height / 2 - WHITE_KEY_HEIGHT / 2 + (key.type === 'black' ? 5 : 0)
      const keyBottomZ = -key.height / 2 - WHITE_KEY_HEIGHT / 2 + (key.type === 'black' ? 5 : 0)
      
      if (x >= key.x - halfWidth && x <= key.x + halfWidth) {
        if (y >= keyBottomZ * 2 && y <= keyTopZ * 2 + 100) {
          return key
        }
      }
    }
    return null
  }, [])

  const updateHandVisualization = useCallback((handDataList: HandData[]) => {
    for (let i = 0; i < 2; i++) {
      const line = handLinesRef.current[i]
      const points = handPointsRef.current[i]
      
      if (i < handDataList.length) {
        const data = handDataList[i]
        line.visible = true
        points.visible = true
        
        const linePositions = line.geometry.attributes.position.array as Float32Array
        const pointsPositions = points.geometry.attributes.position.array as Float32Array
        
        for (let j = 0; j < HAND_CONNECTIONS.length; j++) {
          const [startIdx, endIdx] = HAND_CONNECTIONS[j]
          const start = normalizeHandToScene(data.landmarks[startIdx])
          const end = normalizeHandToScene(data.landmarks[endIdx])
          
          linePositions[j * 6] = start.x
          linePositions[j * 6 + 1] = start.y
          linePositions[j * 6 + 2] = start.z
          linePositions[j * 6 + 3] = end.x
          linePositions[j * 6 + 4] = end.y
          linePositions[j * 6 + 5] = end.z
        }
        
        for (let j = 0; j < 21; j++) {
          const pos = normalizeHandToScene(data.landmarks[j])
          pointsPositions[j * 3] = pos.x
          pointsPositions[j * 3 + 1] = pos.y
          pointsPositions[j * 3 + 2] = pos.z
        }
        
        line.geometry.attributes.position.needsUpdate = true
        points.geometry.attributes.position.needsUpdate = true
      } else {
        line.visible = false
        points.visible = false
      }
    }
  }, [normalizeHandToScene])

  const processHandData = useCallback((handDataList: HandData[]) => {
    const now = performance.now()
    const fingerTipIndices = [4, 8, 12, 16, 20]
    const currentlyPressed = new Set<number>()

    for (const hand of handDataList) {
      for (const tipIdx of fingerTipIndices) {
        const landmark = hand.landmarks[tipIdx]
        if (!landmark) continue

        const scenePos = normalizeHandToScene(landmark)
        const key = getKeyAtPosition(scenePos.x, scenePos.y)
        
        const fingerId = (hand.handedness === 'Left' ? 100 : 200) + tipIdx

        if (key && landmark.y < PRESS_THRESHOLD) {
          const hover = fingerHoverRef.current.get(fingerId)
          if (!hover || hover.keyIndex !== key.midi) {
            fingerHoverRef.current.set(fingerId, { keyIndex: key.midi, startTime: now })
          } else if (now - hover.startTime >= STAY_DURATION && !key.isPressed) {
            key.isPressed = true
            key.targetY = -PRESS_DEPTH
            key.pressStartTime = now
            const velocity = Math.max(0.2, Math.min(1, 1 - (landmark.y / PRESS_THRESHOLD)))
            key.velocity = velocity
            currentlyPressed.add(key.midi)
            
            if (audioEngine) {
              audioEngine.playNote(key.midi, velocity)
            }
            onNotePlay?.(key.midi, velocity)
            pressedKeysRef.current.add(key.midi)
          }
          
          if (key.isPressed) {
            currentlyPressed.add(key.midi)
          }
        } else {
          fingerHoverRef.current.delete(fingerId)
        }
      }
    }

    for (const key of keysRef.current) {
      if (key.isPressed && !currentlyPressed.has(key.midi)) {
        key.isPressed = false
        key.targetY = 0
        
        if (audioEngine) {
          audioEngine.stopNote(key.midi)
        }
        onNoteStop?.(key.midi)
        pressedKeysRef.current.delete(key.midi)
      }
    }
  }, [normalizeHandToScene, getKeyAtPosition, audioEngine, onNotePlay, onNoteStop])

  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return

    for (const key of keysRef.current) {
      const meshEntry = keyMeshesRef.current.get(key.midi)
      if (!meshEntry) continue

      const { mesh, glow } = meshEntry
      
      key.currentY += (key.targetY - key.currentY) * 0.15
      mesh.position.y = key.currentY

      const glowMat = glow.material as THREE.MeshBasicMaterial
      if (key.isPressed) {
        key.glowIntensity = Math.min(1, key.glowIntensity + 0.1)
      } else {
        key.glowIntensity *= 0.95
      }
      glowMat.opacity = key.glowIntensity * 0.6
      
      glow.scale.y = 1 + key.glowIntensity * 0.5
      glow.scale.x = 1 + key.glowIntensity * 0.1
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current)
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [])

  const handleResize = useCallback(() => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
    
    const width = window.innerWidth
    const height = window.innerHeight
    
    cameraRef.current.aspect = width / height
    cameraRef.current.updateProjectionMatrix()
    rendererRef.current.setSize(width, height)
  }, [])

  useEffect(() => {
    initScene()
    animate()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameRef.current)
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [initScene, animate, handleResize])

  useEffect(() => {
    if (handData.length > 0) {
      updateHandVisualization(handData)
      processHandData(handData)
    } else {
      for (const key of keysRef.current) {
        if (key.isPressed) {
          key.isPressed = false
          key.targetY = 0
          if (audioEngine) {
            audioEngine.stopNote(key.midi)
          }
          onNoteStop?.(key.midi)
        }
      }
      pressedKeysRef.current.clear()
      fingerHoverRef.current.clear()
      updateHandVisualization([])
    }
  }, [handData, updateHandVisualization, processHandData, audioEngine, onNoteStop])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }} 
    />
  )
}

export default InstrumentScene
