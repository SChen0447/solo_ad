import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameMap } from './map/GameMap';
import { useGameState } from './hooks/useGameState';
import { InfoPanel } from './components/InfoPanel';
import { VictoryModal } from './components/VictoryModal';
import { HistoryPanel } from './components/HistoryPanel';

const App: React.FC = () => {
  const {
    tiles,
    gameState,
    selectedUnit,
    damagePopups,
    attackingTarget,
    logs,
    isAIThinking,
    selectUnit,
    handleTileClick,
    endTurn,
    resetGame,
  } = useGameState();

  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsSmallScreen(window.innerWidth < 600);
      setIsMobile(window.innerWidth < 768);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a2e',
      }}
    >
      <motion.div
        style={{
          flex: isMobile ? '1 1 auto' : '0 0 70%',
          height: isMobile ? '60%' : '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <GameMap
          tiles={tiles}
          units={gameState.units.filter(u => u.currentHealth > 0)}
          selectedUnitId={gameState.selectedUnitId}
          moveRange={gameState.moveRange}
          attackRange={gameState.attackRange}
          pathPreview={gameState.pathPreview}
          damagePopups={damagePopups}
          onTileClick={handleTileClick}
          onUnitClick={selectUnit}
          isSmallScreen={isSmallScreen}
          attackingTarget={attackingTarget}
        />

        {isAIThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '20px 40px',
              borderRadius: '12px',
              color: '#f1c40f',
              fontSize: '18px',
              fontWeight: 'bold',
              zIndex: 100,
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              AI思考中...
            </motion.span>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        style={{
          flex: isMobile ? '0 0 40%' : '0 0 25%',
          height: isMobile ? '40%' : '100%',
          backgroundColor: '#16213e',
          borderLeft: isMobile ? 'none' : '2px solid #0f3460',
          borderTop: isMobile ? '2px solid #0f3460' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
        initial={{ x: isMobile ? 0 : 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <InfoPanel
          turn={gameState.turn}
          currentTeam={gameState.currentTeam}
          selectedUnit={selectedUnit}
          logs={logs}
          onEndTurn={endTurn}
          onResetGame={resetGame}
          isPlayerTurn={gameState.currentTeam === 'player' && gameState.phase !== 'gameOver'}
          onShowHistory={() => setShowHistory(true)}
        />
      </motion.div>

      <AnimatePresence>
        {gameState.phase === 'gameOver' && gameState.winner && (
          <VictoryModal
            winner={gameState.winner}
            onClose={resetGame}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <HistoryPanel onClose={() => setShowHistory(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
