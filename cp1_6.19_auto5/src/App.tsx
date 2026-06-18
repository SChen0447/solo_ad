import { GameCanvas } from './components/GameCanvas'

export function App() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0a0a0a',
      }}
    >
      <GameCanvas />
    </div>
  )
}
