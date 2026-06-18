import { useState } from 'react'
import { useGameStore } from './store/gameStore'
import SongSelector from './ui/SongSelector'
import ControlPanel from './ui/ControlPanel'
import GameBoard from './game/GameBoard'
import ResultPanel from './ui/ResultPanel'

type AppScreen = 'selector' | 'game'

function App() {
  const [screen, setScreen] = useState<AppScreen>('selector')
  const { selectedSong, isGameOver, resetGame } = useGameStore()

  const handleSongSelect = () => {
    setScreen('game')
  }

  const handleBackToSelector = () => {
    resetGame()
    setScreen('selector')
  }

  const handleRetry = () => {
    resetGame()
    setTimeout(() => {
      useGameStore.getState().startGame()
    }, 300)
  }

  return (
    <div className="app-container">
      {screen === 'selector' && (
        <SongSelector onStartGame={handleSongSelect} />
      )}
      {screen === 'game' && selectedSong && (
        <div className="game-screen">
          <ControlPanel onBack={handleBackToSelector} onRetry={handleRetry} />
          <GameBoard />
          {isGameOver && (
            <ResultPanel
              onRetry={handleRetry}
              onBack={handleBackToSelector}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default App
