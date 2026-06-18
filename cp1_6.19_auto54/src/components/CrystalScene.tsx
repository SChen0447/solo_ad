import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  OrbitControls,
  Line,
  Float,
  Html,
} from '@react-three/drei'
import * as THREE from 'three'
import { getLaserPaths, DiffractionSpot } from '@/diffractionEngine'

interface CrystalSceneProps {
  rotationAngle: number
  tiltAngle: number
  incidentAngle: number
}

function Crystal({
  rotationAngle,
  tiltAngle,
}: {
  rotationAngle: number
  tiltAngle: number
}) {
  const crystalRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)

  const rotRad = (rotationAngle * Math.PI) / 180
  const tiltRad = (tiltAngle * Math.PI) / 180

  const edgesGeometry = useMemo(() => {
    const octahedron = new THREE.OctahedronGeometry(1, 0)
    return new THREE.EdgesGeometry(octahedron)
  }, [])

  return (
    <group>
      <group rotation={[tiltRad, rotRad, 0]}>
        <mesh ref={crystalRef} geometry={new THREE.OctahedronGeometry(1, 0)}>
          <meshPhysicalMaterial
            color="#88ccff"
            transparent
            opacity={0.22}
            roughness={0.1}
            metalness={0.1}
            transmission={0.6}
            thickness={0.5}
            envMapIntensity={1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
        <lineSegments ref={edgesRef} geometry={edgesGeometry}>
          <lineBasicMaterial
            color="#00d4ff"
            linewidth={2}
            transparent
            opacity={0.95}
          />
        </lineSegments>
      </group>
    </group>
  )
}

function AxesHelper() {
  const axisLength = 2
  return (
    <group>
      <group>
        <Line
          points={[
            [0, 0, 0],
            [axisLength, 0, 0],
          ]}
          color="#ff4444"
          lineWidth={2}
          transparent
          opacity={0.75}
        />
        <mesh position={[axisLength * 0.92, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.06, 0.16, 16]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.85} />
        </mesh>
      </group>

      <group>
        <Line
          points={[
            [0, 0, 0],
            [0, axisLength, 0],
          ]}
          color="#44ff44"
          lineWidth={2}
          transparent
          opacity={0.75}
        />
        <mesh position={[0, axisLength * 0.92, 0]}>
          <coneGeometry args={[0.06, 0.16, 16]} />
          <meshBasicMaterial color="#44ff44" transparent opacity={0.85} />
        </mesh>
      </group>

      <group>
        <Line
          points={[
            [0, 0, 0],
            [0, 0, axisLength],
          ]}
          color="#4488ff"
          lineWidth={2}
          transparent
          opacity={0.75}
        />
        <mesh position={[0, 0, axisLength * 0.92]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.06, 0.16, 16]} />
          <meshBasicMaterial color="#4488ff" transparent opacity={0.85} />
        </mesh>
      </group>
    </group>
  )
}

function LaserRays({
  rotationAngle,
  tiltAngle,
  incidentAngle,
}: {
  rotationAngle: number
  tiltAngle: number
  incidentAngle: number
}) {
  const paths = getLaserPaths(rotationAngle, tiltAngle, incidentAngle)

  const incidentRef = useRef<THREE.Group>(null)
  const reflectedRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime
    if (incidentRef.current) {
      incidentRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          ;(child.material as THREE.MeshBasicMaterial).opacity =
            0.55 + Math.sin(time * 4) * 0.2
        }
      })
    }
    if (reflectedRef.current) {
      reflectedRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          ;(child.material as THREE.MeshBasicMaterial).opacity =
            0.55 + Math.sin(time * 4 + 1) * 0.2
        }
      })
    }
  })

  return (
    <group>
      <group ref={incidentRef}>
        <Line
          points={[paths.incidentStart, paths.incidentEnd]}
          color="#ffe082"
          lineWidth={3}
          transparent
          opacity={0.75}
        />
        <mesh
          position={[
            (paths.incidentStart[0] + paths.incidentEnd[0]) / 2,
            (paths.incidentStart[1] + paths.incidentEnd[1]) / 2,
            (paths.incidentStart[2] + paths.incidentEnd[2]) / 2,
          ]}
        >
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial
            color="#ffe082"
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>

      <group ref={reflectedRef}>
        <Line
          points={[paths.reflectedStart, paths.reflectedEnd]}
          color="#80deea"
          lineWidth={3}
          transparent
          opacity={0.75}
        />
        <mesh
          position={[
            (paths.reflectedStart[0] + paths.reflectedEnd[0]) / 2,
            (paths.reflectedStart[1] + paths.reflectedEnd[1]) / 2,
            (paths.reflectedStart[2] + paths.reflectedEnd[2]) / 2,
          ]}
        >
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial
            color="#80deea"
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>

      <mesh position={paths.reflectionPoint}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  )
}

function DiffractionScreen3D({ spots }: { spots: DiffractionSpot[] }) {
  return null
}

function SceneContent({
  rotationAngle,
  tiltAngle,
  incidentAngle,
  spots,
}: CrystalSceneProps & { spots: DiffractionSpot[] }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        color="#ffffff"
        castShadow
      />
      <pointLight position={[-5, 3, -5]} intensity={0.8} color="#00d4ff" />
      <pointLight position={[5, -3, 5]} intensity={0.6} color="#ffe082" />

      <Float
        speed={1.2}
        rotationIntensity={0.3}
        floatIntensity={0.4}
        floatingRange={[-0.08, 0.08]}
      >
        <Crystal rotationAngle={rotationAngle} tiltAngle={tiltAngle} />
      </Float>

      <LaserRays
        rotationAngle={rotationAngle}
        tiltAngle={tiltAngle}
        incidentAngle={incidentAngle}
      />

      <AxesHelper />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        minDistance={1}
        maxDistance={8}
      />

      <DiffractionScreen3D spots={spots} />
    </>
  )
}

export function CrystalScene({
  rotationAngle,
  tiltAngle,
  incidentAngle,
  spots,
}: CrystalSceneProps & { spots: DiffractionSpot[] }) {
  return (
    <div className="canvas-wrapper">
      <Canvas
        camera={{
          position: [3.5, 2.5, 4.5],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        frameloop="always"
      >
        <color attach="background" args={['#0a0f1a']} />
        <fog attach="fog" args={['#0a0f1a', 8, 16]} />
        <SceneContent
          rotationAngle={rotationAngle}
          tiltAngle={tiltAngle}
          incidentAngle={incidentAngle}
          spots={spots}
        />
      </Canvas>
    </div>
  )
}
