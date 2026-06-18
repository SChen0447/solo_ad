import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useBubbleStore } from '../stores/bubbleStore'
import { BubbleNode } from './BubbleNode'

interface SceneProps {
  onBackgroundClick: (position: THREE.Vector3) => void
}

function StarField() {
  const pointsRef = useRef<THREE.Points>(null)
  const count = 300

  const [positions, sizes, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const siz = new Float32Array(count)
    const pha = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 15 + Math.random() * 10
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)
      siz[i] = 0.3 + Math.random() * 0.7
      pha[i] = Math.random() * Math.PI * 2
    }
    return [pos, siz, pha]
  }, [])

  useFrame((state) => {
    if (pointsRef.current) {
      const material = pointsRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  const starVertexShader = `
    attribute float aSize;
    attribute float aPhase;
    uniform float uTime;
    varying float vAlpha;
    
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float twinkle = sin(uTime * 0.5 + aPhase) * 0.5 + 0.5;
      gl_PointSize = aSize * (300.0 / -mvPosition.z) * (0.5 + twinkle * 0.5);
      vAlpha = 0.3 + twinkle * 0.7;
      gl_Position = projectionMatrix * mvPosition;
    }
  `

  const starFragmentShader = `
    varying float vAlpha;
    
    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      if (dist > 0.5) discard;
      float alpha = (1.0 - dist * 2.0) * vAlpha;
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    }
  `

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), [])

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          count={count}
          array={phases}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function ConnectionLines() {
  const { bubbles, connections } = useBubbleStore()
  const linesRef = useRef<THREE.LineSegments>(null)

  const bubbleMap = useMemo(() => {
    const map = new Map<string, typeof bubbles[0]>()
    bubbles.forEach(b => map.set(b.id, b))
    return map
  }, [bubbles])

  const { positions, lineWidths } = useMemo(() => {
    const pos: number[] = []
    const widths: number[] = []
    connections.forEach(conn => {
      const from = bubbleMap.get(conn.from)
      const to = bubbleMap.get(conn.to)
      if (!from || !to) return
      const dist = from.position.distanceTo(to.position)
      if (dist > 1.5) return
      pos.push(
        from.position.x, from.position.y, from.position.z,
        to.position.x, to.position.y, to.position.z
      )
      const width = 0.003 + conn.similarity * 0.007
      widths.push(width, width)
    })
    return {
      positions: new Float32Array(pos),
      lineWidths: new Float32Array(widths)
    }
  }, [connections, bubbleMap])

  useFrame(() => {
    if (!linesRef.current || connections.length === 0) return
    const geometry = linesRef.current.geometry
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    let needsUpdate = false

    connections.forEach((conn, i) => {
      const from = bubbleMap.get(conn.from)
      const to = bubbleMap.get(conn.to)
      if (!from || !to) return
      const idx = i * 6
      if (
        posAttr.array[idx] !== from.position.x ||
        posAttr.array[idx + 1] !== from.position.y ||
        posAttr.array[idx + 2] !== from.position.z ||
        posAttr.array[idx + 3] !== to.position.x ||
        posAttr.array[idx + 4] !== to.position.y ||
        posAttr.array[idx + 5] !== to.position.z
      ) {
        posAttr.array[idx] = from.position.x
        posAttr.array[idx + 1] = from.position.y
        posAttr.array[idx + 2] = from.position.z
        posAttr.array[idx + 3] = to.position.x
        posAttr.array[idx + 4] = to.position.y
        posAttr.array[idx + 5] = to.position.z
        needsUpdate = true
      }
    })
    if (needsUpdate) {
      posAttr.needsUpdate = true
    }
  })

  if (positions.length === 0) return null

  const lineVertexShader = `
    attribute float aLineWidth;
    varying float vAlpha;
    
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      vAlpha = 0.4;
    }
  `

  const lineFragmentShader = `
    uniform vec3 uColor;
    varying float vAlpha;
    
    void main() {
      gl_FragColor = vec4(uColor, vAlpha);
    }
  `

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#a5c9ff"
        transparent
        opacity={0.4}
      />
    </lineSegments>
  )
}

function BubbleGroup() {
  const { bubbles } = useBubbleStore()
  return (
    <group>
      {bubbles.map(bubble => (
        <BubbleNode key={bubble.id} bubble={bubble} />
      ))}
    </group>
  )
}

function ClickHandler({ onBackgroundClick }: { onBackgroundClick: (pos: THREE.Vector3) => void }) {
  const { camera } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  const handleClick = (e: any) => {
    if (e.eventObject !== e.scene) return
    mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.current.setFromCamera(mouse.current, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const point = new THREE.Vector3()
    raycaster.current.ray.intersectPlane(plane, point)
    onBackgroundClick(point)
  }

  return (
    <mesh onClick={handleClick} position={[0, 0, -5]}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function SceneContent({ onBackgroundClick }: SceneProps) {
  const { bubbles, updateConnections, isReorganizing, setIsReorganizing } = useBubbleStore()
  const lastBubbleCount = useRef(bubbles.length)

  useEffect(() => {
    if (bubbles.length !== lastBubbleCount.current) {
      lastBubbleCount.current = bubbles.length
      updateConnections()
    }
  }, [bubbles.length, updateConnections])

  useEffect(() => {
    if (isReorganizing) {
      const timer = setTimeout(() => {
        setIsReorganizing(false)
        updateConnections()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isReorganizing, setIsReorganizing, updateConnections])

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#d4a5ff" />

      <StarField />
      <ConnectionLines />
      <BubbleGroup />
      <ClickHandler onBackgroundClick={onBackgroundClick} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={25}
        enablePan={false}
      />
    </>
  )
}

export function BubbleScene({ onBackgroundClick }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'linear-gradient(180deg, #1a0a2e 0%, #0d0b1f 100%)' }}
    >
      <SceneContent onBackgroundClick={onBackgroundClick} />
    </Canvas>
  )
}
