import { Canvas } from '@react-three/fiber'
import EmotionNebula from './components/EmotionNebula'
import EmotionInput from './components/EmotionInput'
import EmotionRadar from './components/EmotionRadar'
import ControlPanel from './components/ControlPanel'

export default function App() {
  return (
    <div style={styles.container}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={styles.canvas}
      >
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 10, 30]} />
        <EmotionNebula />
      </Canvas>

      <EmotionRadar />
      <EmotionInput />
      <ControlPanel />

      <div style={styles.footer}>
        <span style={styles.footerText}>
          拖拽旋转 · 滚轮缩放 · 情绪星云
        </span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    background: '#1a1a2e'
  },
  canvas: {
    width: '100%',
    height: '100%'
  },
  footer: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    pointerEvents: 'none'
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '12px',
    letterSpacing: '2px'
  }
}
