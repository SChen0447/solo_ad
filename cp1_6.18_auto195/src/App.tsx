import { Canvas } from '@react-three/fiber'
import SceneRenderer from './scene_renderer'
import ControlPanel from './control_panel'

export default function App() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 2, 4], fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <SceneRenderer />
      </Canvas>
      <ControlPanel />
    </div>
  )
}
