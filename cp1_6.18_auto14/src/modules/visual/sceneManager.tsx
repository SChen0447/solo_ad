import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { CentralSphere } from './centralSphere'
import { WaveColumns } from './waveColumns'
import { ParticleHalo } from './particleHalo'
import { ColorTheme, THEMES } from './types'

interface SceneProps {
  energy: { low: number; mid: number; high: number }
  rawFrequencyData: Uint8Array
  sensitivity: number
  particleCount: number
  theme: ColorTheme
  autoRotate: boolean
}

const SceneContent: React.FC<SceneProps> = ({
  energy, rawFrequencyData, sensitivity, particleCount, theme, autoRotate
}) => {
  const controlsRef = useRef<any>(null)
  const colors = THEMES[theme]

  useFrame(() => {
    if (controlsRef.current && autoRotate) {
      controlsRef.current.autoRotateSpeed = 0.6 + energy.low * 2
    }
  })

  return (
    <>
      <color attach="background" args={['#050508']} />
      <fog attach="fog" args={['#050508', 8, 20]} />

      <ambientLight intensity={0.15} />
      <pointLight position={[5, 5, 5]} intensity={1} color={colors.primary} distance={15} />
      <pointLight position={[-5, -3, -5]} intensity={0.8} color={colors.accent} distance={15} />
      <pointLight position={[0, 4, 0]} intensity={0.6} color={colors.secondary} distance={12} />

      <Stars
        radius={50}
        depth={30}
        count={1500}
        factor={3}
        saturation={0.3}
        fade
        speed={0.5}
      />

      <CentralSphere
        lowEnergy={energy.low}
        theme={theme}
        sensitivity={sensitivity}
      />

      <WaveColumns
        midEnergy={energy.mid}
        rawFrequencyData={rawFrequencyData}
        theme={theme}
        sensitivity={sensitivity}
      />

      <ParticleHalo
        highEnergy={energy.high}
        theme={theme}
        sensitivity={sensitivity}
        particleCount={particleCount}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={16}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
      />
    </>
  )
}

export const SceneManager: React.FC<SceneProps> = (props) => {
  return (
    <Canvas
      camera={{ position: [0, 3, 8], fov: 60 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
