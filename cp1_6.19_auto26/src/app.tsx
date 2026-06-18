import Toolbar from './toolbar'
import Canvas from './canvas'
import Library from './library'

export default function App() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#1e1e2e',
      }}
    >
      <Toolbar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Canvas />
        <Library />
      </div>
    </div>
  )
}
