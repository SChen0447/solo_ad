import Scene from './Scene'
import UI from './UI'

export default function App() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#1a1a1a',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
        }}
      >
        <Scene />
      </div>

      <UI />
    </div>
  )
}
