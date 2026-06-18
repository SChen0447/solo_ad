import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, GradientTexture } from '@react-three/drei'
import * as THREE from 'three'
import { ParticleSystem } from './components/ParticleSystem'
import { SpectrumSlider } from './components/SpectrumSlider'

function Stage() {
  return (
    <>
      <color attach="background" args={['#0f0c29']} />

      <mesh>
        <sphereGeometry args={[120, 32, 32]} />
        <meshBasicMaterial side={THREE.BackSide}>
          <GradientTexture
            stops={[0, 0.5, 1]}
            colors={['#0f0c29', '#302b63', '#24243e']}
            attach="map"
          />
        </meshBasicMaterial>
      </mesh>

      <ambientLight intensity={0.35} color="#a855f7" />
      <pointLight position={[0, 15, 0]} intensity={0.5} color="#00d4ff" distance={50} />
      <pointLight position={[-15, -5, 10]} intensity={0.3} color="#a855f7" distance={60} />
      <pointLight position={[15, 10, -10]} intensity={0.25} color="#60a5fa" distance={55} />

      <gridHelper
        args={[100, 50, '#4a4a8a', '#4a4a8a']}
        position={[0, -12, 0]}
      >
        <meshBasicMaterial
          attach="material"
          color="#4a4a8a"
          transparent
          opacity={0.15}
        />
      </gridHelper>

      <ParticleSystem />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.3}
        minDistance={1}
        maxDistance={30}
        makeDefault
      />
    </>
  )
}

export function App() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 2, 18], fov: 60, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Stage />
        </Suspense>
      </Canvas>
      <SpectrumSlider />
    </div>
  )
}
