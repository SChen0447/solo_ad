import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { create } from 'zustand'
import GeometryModule from './scene/GeometryModule'
import ParticleHalo from './scene/ParticleHalo'
import ControlPanel from './ui/ControlPanel'

export type ColorTheme = 'deepBlue' | 'purpleRed' | 'greenYellow'

export interface ThemeColors {
  geometryStart: string
  geometryEnd: string
  particleStart: string
  particleEnd: string
}

export const themePresets: Record<ColorTheme, ThemeColors> = {
  deepBlue: {
    geometryStart: '#2c3e50',
    geometryEnd: '#3498db',
    particleStart: '#f1c40f',
    particleEnd: '#e67e22',
  },
  purpleRed: {
    geometryStart: '#6c3483',
    geometryEnd: '#e74c3c',
    particleStart: '#f39c12',
    particleEnd: '#c0392b',
  },
  greenYellow: {
    geometryStart: '#1e8449',
    geometryEnd: '#f1c40f',
    particleStart: '#2ecc71',
    particleEnd: '#f39c12',
  },
}

interface AppState {
  breathFrequency: number
  colorTheme: ColorTheme
  isPlaying: boolean
  manualBreath: number
  setBreathFrequency: (freq: number) => void
  setColorTheme: (theme: ColorTheme) => void
  togglePlaying: () => void
  triggerManualBreath: () => void
}

export const useAppStore = create<AppState>((set) => ({
  breathFrequency: 0.5,
  colorTheme: 'deepBlue',
  isPlaying: true,
  manualBreath: 0,
  setBreathFrequency: (freq) => set({ breathFrequency: freq }),
  setColorTheme: (theme) => set({ colorTheme: theme }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  triggerManualBreath: () => set((state) => ({ manualBreath: state.manualBreath + 1 })),
}))

export default function App() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0d0d1a' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0d0d1a']} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3498db" />
        <GeometryModule />
        <ParticleHalo />
        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={32}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      <ControlPanel />
    </div>
  )
}
