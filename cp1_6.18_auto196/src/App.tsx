import { useEffect } from 'react'
import GameScene from './GameScene'
import UIPanel from './UIPanel'
import { gameCore } from './GameCore'
import { useGameStore } from './store'

export default function App() {
  const phase = useGameStore(state => state.phase)

  useEffect(() => {
    gameCore.start()
    return () => {
      gameCore.stop()
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GameScene />
      <UIPanel />
    </div>
  )
}
