import { useEffect, useState } from 'react';
import StarBackground from './components/StarBackground';
import GameBoard from './components/GameBoard';
import TotemPanel from './components/TotemPanel';
import StatusBar from './components/StatusBar';
import MainMenu from './components/MainMenu';
import SaveMenu from './components/SaveMenu';
import { gameEngine } from './utils/gameEngine';
import { GameState } from './types';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState>(gameEngine.getState());

  useEffect(() => {
    const unsubscribe = gameEngine.subscribe(() => {
      setGameState(gameEngine.getState());
    });
    return unsubscribe;
  }, []);

  const handleNewGame = async () => {
    await gameEngine.initializeGame();
  };

  const handleShowSaves = () => {
    gameEngine.setView('saves');
  };

  const handleBackToMenu = () => {
    gameEngine.setView('menu');
  };

  const handleSaveGame = async (slot: number) => {
    await gameEngine.saveGame(slot);
    gameEngine.setShowSaveMenu(false);
  };

  const handleLoadGame = async (slot: number) => {
    await gameEngine.loadGame(slot);
  };

  const renderContent = () => {
    switch (gameState.currentView) {
      case 'menu':
        return <MainMenu onNewGame={handleNewGame} onLoadGame={handleShowSaves} />;
      case 'saves':
        return <SaveMenu onLoad={handleLoadGame} onBack={handleBackToMenu} />;
      case 'game':
      default:
        return (
          <div className="game-layout">
            <StatusBar
              resources={gameState.resources}
              totems={gameState.totems}
              onSaveClick={() => gameEngine.setShowSaveMenu(true)}
              onMenuClick={handleBackToMenu}
            />
            <div className="game-main">
              <GameBoard
                rooms={gameState.rooms}
                playerPos={gameState.playerPos}
                clearedLines={gameState.clearedLines}
                selectedTotemId={gameState.selectedTotemId}
              />
              <TotemPanel
                totems={gameState.totems}
                selectedId={gameState.selectedTotemId}
                onSelect={gameEngine.selectTotem.bind(gameEngine)}
                onReorder={gameEngine.reorderTotems.bind(gameEngine)}
              />
            </div>
            {gameState.showSaveMenu && (
              <div className="save-overlay">
                <div className="save-dialog glass-card">
                  <h3>保存游戏</h3>
                  <div className="save-slots">
                    {[1, 2, 3].map((slot) => (
                      <button
                        key={slot}
                        className="save-slot-btn glass-card"
                        onClick={() => handleSaveGame(slot)}
                      >
                        存档位 {slot}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => gameEngine.setShowSaveMenu(false)}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <StarBackground />
      {renderContent()}
    </div>
  );
}

export default App;
