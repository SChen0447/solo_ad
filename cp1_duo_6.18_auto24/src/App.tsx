import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { NeuronManager, NeuronNode, Connection } from './NeuronManager'
import { SignalTransmitter, Particle } from './SignalTransmitter'
import { UIPanel } from './UIPanel'
import { useNeuronStore, getSignalSpeed } from './store'

const SceneContent: React.FC<{
  neuronManager: NeuronManager
  signalTransmitter: SignalTransmitter
}> = ({ neuronManager, signalTransmitter }) => {
  const { signalStrength, synapseCount, transmissionDelay, randomizeTrigger } = useNeuronStore()
  const [, forceUpdate] = useState({})
  const [hoveredNode, setHoveredNode] = useState<number | null>(null)

  useEffect(() => {
    neuronManager.setSynapseCount(synapseCount)
    signalTransmitter.reset()
    forceUpdate({})
  }, [synapseCount, neuronManager, signalTransmitter])

  useEffect(() => {
    if (randomizeTrigger > 0) {
      neuronManager.randomizePositions()
      signalTransmitter.reset()
      forceUpdate({})
    }
  }, [randomizeTrigger, neuronManager, signalTransmitter])

  useEffect(() => {
    signalTransmitter.setSpeed(getSignalSpeed(signalStrength))
    signalTransmitter.setSignalStrength(signalStrength)
  }, [signalStrength, signalTransmitter])

  useFrame((_, delta) => {
    signalTransmitter.update(delta * 60)
    forceUpdate({})
  })

  const handleNodeHover = (nodeId: number | null) => {
    if (nodeId !== null) {
      neuronManager.clearAllHighlights()
      neuronManager.highlightNode(nodeId, true)
      setHoveredNode(nodeId)
    } else {
      neuronManager.clearAllHighlights()
      setHoveredNode(null)
    }
  }

  return (
    <group>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      <ConnectionLines neuronManager={neuronManager} />

      <NeuronNodes
        neuronManager={neuronManager}
        transmissionDelay={transmissionDelay}
        onHover={handleNodeHover}
      />

      <ParticlesSystem signalTransmitter={signalTransmitter} />
    </group>
  )
}

const NeuronNodes: React.FC<{
  neuronManager: NeuronManager
  transmissionDelay: number
  onHover: (id: number | null) => void
}> = ({ neuronManager, transmissionDelay, onHover }) => {
  const nodes = neuronManager.getAllNodes()

  return (
    <group>
      {nodes.map((node) => (
        <NeuronSphere
          key={node.id}
          node={node}
          isFlashing={neuronManager.isFlashing(node.id, transmissionDelay)}
          pulseIntensity={neuronManager.getPulseIntensity(node.id)}
          pulseColor={neuronManager.getPulseColor(node.id)}
          onHover={onHover}
        />
      ))}
    </group>
  )
}

const NeuronSphere: React.FC<{
  node: NeuronNode
  isFlashing: boolean
  pulseIntensity: number
  pulseColor: string | null
  onHover: (id: number | null) => void
}> = ({ node, isFlashing, pulseIntensity, pulseColor, onHover }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(Math.random() * Math.PI * 2)

  useFrame((_, delta) => {
    timeRef.current += delta
    const breathePeriod = 2
    const breathePhase = (timeRef.current / breathePeriod) * Math.PI * 2
    const breatheScale = 1 + Math.sin(breathePhase) * 0.05

    const highlightScale = node.isHighlighted ? 1.2 : 1
    const totalScale = breatheScale * highlightScale

    if (meshRef.current) {
      meshRef.current.scale.setScalar(totalScale)
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(totalScale * 1.25)
    }
  })

  const baseColor = isFlashing ? '#ffffff' : node.color
  const finalColor = pulseIntensity > 0 && pulseColor ? pulseColor : baseColor
  const emissiveIntensity = isFlashing ? 1.5 : 0.4 + pulseIntensity * 0.8
  const glowOpacity = 0.3 + pulseIntensity * 0.4

  return (
    <group position={node.position.toArray()}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial
          color={finalColor}
          transparent
          opacity={glowOpacity}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(node.id)
        }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          color={finalColor}
          emissive={finalColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.2}
          roughness={0.6}
        />
      </mesh>
    </group>
  )
}

const ConnectionLines: React.FC<{
  neuronManager: NeuronManager
}> = ({ neuronManager }) => {
  const connections = neuronManager.getConnections()
  const lineRef = useRef<THREE.LineSegments>(null)

  const { positions, colors } = useMemo(() => {
    const pos: number[] = []
    const col: number[] = []

    connections.forEach((conn) => {
      const preNode = neuronManager.getNodeById(conn.presynapticId)
      const postNode = neuronManager.getNodeById(conn.postsynapticId)

      if (preNode && postNode) {
        pos.push(
          preNode.position.x, preNode.position.y, preNode.position.z,
          postNode.position.x, postNode.position.y, postNode.position.z
        )

        const color = conn.isHighlighted
          ? new THREE.Color('#ffffff')
          : new THREE.Color('#cccccc')

        col.push(color.r, color.g, color.b, color.r, color.g, color.b)
      }
    })

    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
    }
  }, [connections, neuronManager])

  useFrame(() => {
    if (!lineRef.current) return
    const posAttr = lineRef.current.geometry.attributes.position as THREE.BufferAttribute
    const colAttr = lineRef.current.geometry.attributes.color as THREE.BufferAttribute
    if (!posAttr || !colAttr) return

    const posArray = posAttr.array as Float32Array
    const colArray = colAttr.array as Float32Array

    connections.forEach((conn, i) => {
      const preNode = neuronManager.getNodeById(conn.presynapticId)
      const postNode = neuronManager.getNodeById(conn.postsynapticId)

      if (preNode && postNode) {
        const idx = i * 6
        posArray[idx] = preNode.position.x
        posArray[idx + 1] = preNode.position.y
        posArray[idx + 2] = preNode.position.z
        posArray[idx + 3] = postNode.position.x
        posArray[idx + 4] = postNode.position.y
        posArray[idx + 5] = postNode.position.z

        const color = conn.isHighlighted
          ? new THREE.Color('#ffffff')
          : new THREE.Color('#cccccc')

        colArray[idx] = color.r
        colArray[idx + 1] = color.g
        colArray[idx + 2] = color.b
        colArray[idx + 3] = color.r
        colArray[idx + 4] = color.g
        colArray[idx + 5] = color.b
      }
    })

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.5}
      />
    </lineSegments>
  )
}

const ParticlesSystem: React.FC<{ signalTransmitter: SignalTransmitter }> = ({ signalTransmitter }) => {
  const particles = signalTransmitter.getParticles()

  return (
    <group>
      {particles.map((particle) => (
        <ParticleWithTrail key={particle.id} particle={particle} />
      ))}
    </group>
  )
}

const ParticleWithTrail: React.FC<{ particle: Particle }> = ({ particle }) => {
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const trailMeshesRef = useRef<(THREE.Mesh | null)[]>([null, null, null, null, null])

  useFrame(() => {
    dummy.position.copy(particle.position)
    dummy.scale.setScalar(0.08)
    dummy.updateMatrix()

    const history = particle.positionHistory
    for (let i = 0; i < 5; i++) {
      const mesh = trailMeshesRef.current[i]
      if (!mesh) continue

      if (i < history.length) {
        mesh.visible = true
        mesh.position.copy(history[i])
        const alpha = (1 - i / 5) * 0.5
        ;(mesh.material as THREE.MeshBasicMaterial).opacity = alpha
        const scale = 0.08 * (1 - i * 0.15)
        mesh.scale.setScalar(scale)
      } else {
        mesh.visible = false
      }
    }
  })

  return (
    <group>
      <mesh position={particle.position.toArray()} scale={0.08}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#4da6ff" transparent opacity={1} />
      </mesh>

      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          ref={(el) => { trailMeshesRef.current[i] = el }}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial
            color="#4da6ff"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

const CameraController: React.FC = () => {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(8, 4, 10)
    camera.lookAt(0, 0, 0)
  }, [camera])

  return null
}

const App: React.FC = () => {
  const neuronManager = useMemo(() => new NeuronManager(30), [])
  const signalTransmitter = useMemo(() => new SignalTransmitter(neuronManager), [neuronManager])

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#0a0a1a' }}>
      <Canvas
        camera={{ position: [8, 4, 10], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0a1a')
        }}
      >
        <CameraController />
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={30}
          enableDamping
          dampingFactor={0.05}
        />
        <SceneContent
          neuronManager={neuronManager}
          signalTransmitter={signalTransmitter}
        />
      </Canvas>
      <UIPanel />
    </div>
  )
}

export default App
