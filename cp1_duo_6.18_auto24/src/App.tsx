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
  const [nodes, setNodes] = useState<NeuronNode[]>(neuronManager.getAllNodes())
  const [connections, setConnections] = useState<Connection[]>(neuronManager.getConnections())
  const [particles, setParticles] = useState<Particle[]>([])
  const [hoveredNode, setHoveredNode] = useState<number | null>(null)

  useEffect(() => {
    neuronManager.setSynapseCount(synapseCount)
    signalTransmitter.reset()
    setNodes(neuronManager.getAllNodes())
    setConnections(neuronManager.getConnections())
  }, [synapseCount, neuronManager, signalTransmitter])

  useEffect(() => {
    if (randomizeTrigger > 0) {
      neuronManager.randomizePositions()
      signalTransmitter.reset()
      setNodes([...neuronManager.getAllNodes()])
      setConnections([...neuronManager.getConnections()])
    }
  }, [randomizeTrigger, neuronManager, signalTransmitter])

  useEffect(() => {
    signalTransmitter.setSpeed(getSignalSpeed(signalStrength))
    signalTransmitter.setSignalStrength(signalStrength)
  }, [signalStrength, signalTransmitter])

  useFrame((_, delta) => {
    signalTransmitter.update(delta * 60)
    setParticles(signalTransmitter.getParticles())
    setNodes([...neuronManager.getAllNodes()])
  })

  const handleNodeHover = (nodeId: number | null) => {
    if (nodeId !== null) {
      neuronManager.highlightNode(nodeId, true)
      setHoveredNode(nodeId)
    } else if (hoveredNode !== null) {
      neuronManager.highlightNode(hoveredNode, false)
      setHoveredNode(null)
    }
  }

  return (
    <group>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      <ConnectionLines connections={connections} neuronManager={neuronManager} />

      {nodes.map((node) => (
        <NeuronSphere
          key={node.id}
          node={node}
          isFlashing={neuronManager.isFlashing(node.id, transmissionDelay)}
          onHover={handleNodeHover}
        />
      ))}

      <Particles particles={particles} />
    </group>
  )
}

const NeuronSphere: React.FC<{
  node: NeuronNode
  isFlashing: boolean
  onHover: (id: number | null) => void
}> = ({ node, isFlashing, onHover }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const baseColor = useMemo(() => {
    return isFlashing ? '#ffffff' : node.color
  }, [isFlashing, node.color])

  const scale = node.isHighlighted ? 1.2 : 1

  return (
    <group position={node.position.toArray()}>
      <mesh
        ref={glowRef}
        scale={[scale * 1.3, scale * 1.3, scale * 1.3]}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh
        ref={meshRef}
        scale={[scale, scale, scale]}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(node.id)
        }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isFlashing ? 1 : 0.3}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>
    </group>
  )
}

const ConnectionLines: React.FC<{
  connections: Connection[]
  neuronManager: NeuronManager
}> = ({ connections, neuronManager }) => {
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
        opacity={0.4}
        linewidth={0.02}
      />
    </lineSegments>
  )
}

const Particles: React.FC<{ particles: Particle[] }> = ({ particles }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const trailGeometries = useMemo(() => {
    return particles.map(() => new THREE.BufferGeometry())
  }, [particles.length])

  useFrame(() => {
    if (!meshRef.current) return

    particles.forEach((particle, i) => {
      dummy.position.copy(particle.position)
      dummy.scale.setScalar(0.08)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, particles.length]}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#4da6ff" transparent opacity={0.9} />
      </instancedMesh>

      {particles.map((particle, idx) => (
        <ParticleTrail key={particle.id} particle={particle} index={idx} />
      ))}
    </group>
  )
}

const ParticleTrail: React.FC<{ particle: Particle; index: number }> = ({ particle }) => {
  const meshRef = useRef<THREE.LineSegments>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(8 * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame(() => {
    if (!meshRef.current) return

    const positions = geometry.attributes.position.array as Float32Array
    const trail = particle.trail

    let idx = 0
    for (let i = 0; i < trail.length - 1; i++) {
      positions[idx++] = trail[i].x
      positions[idx++] = trail[i].y
      positions[idx++] = trail[i].z
      positions[idx++] = trail[i + 1].x
      positions[idx++] = trail[i + 1].y
      positions[idx++] = trail[i + 1].z
    }

    geometry.attributes.position.needsUpdate = true
    geometry.setDrawRange(0, Math.max(0, (trail.length - 1) * 2))
  })

  const opacity = particle.trail.length > 1 ? 0.4 : 0

  return (
    <lineSegments ref={meshRef} geometry={geometry}>
      <lineBasicMaterial color="#4da6ff" transparent opacity={opacity} />
    </lineSegments>
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
        camera={{ position: [8, 4, 10], fov: 60 }}
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
