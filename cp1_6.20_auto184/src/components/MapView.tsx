import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MAP_TILES, TILE_COLORS, TYPE_COLORS, Creature } from '../data/creatures';
import { useGameState } from '../hooks/useGameState';

const TILE_SIZE = 64;
const PLAYER_SIZE = 32;
const BORDER_SIZE = 2;

const MapView = () => {
  const { state, movePlayer, attemptCatch, clearEncounter, canCatch, releaseCreature, getBackpackCreatures } = useGameState();
  const [showCatchFlash, setShowCatchFlash] = useState(false);
  const [showBackpackFull, setShowBackpackFull] = useState(false);
  const [catchMessage, setCatchMessage] = useState<string | null>(null);

  const handleTileClick = (x: number, y: number) => {
    const tile = MAP_TILES[y]?.[x];
    if (tile === 'water') return;
    movePlayer(x, y);
  };

  const handleCatch = () => {
    if (!canCatch()) {
      setShowBackpackFull(true);
      return;
    }

    const success = attemptCatch();
    setShowCatchFlash(true);

    setTimeout(() => {
      setShowCatchFlash(false);
      if (success) {
        setCatchMessage('捕获成功！');
      } else {
        setCatchMessage('捕获失败...');
      }
      setTimeout(() => setCatchMessage(null), 1500);
    }, 500);
  };

  const handleRelease = (creatureId: number) => {
    releaseCreature(creatureId);
    setShowBackpackFull(false);
  };

  const renderStars = (count: number) => {
    return '⭐'.repeat(count);
  };

  const backpackCreatures = getBackpackCreatures();

  return (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold mb-4" style={{ color: '#E0E0E0' }}>探索地图</h2>

      <div
        className="relative"
        style={{
          width: TILE_SIZE * 8 + BORDER_SIZE * 2,
          height: TILE_SIZE * 8 + BORDER_SIZE * 2,
          border: `${BORDER_SIZE}px solid #555555`,
          backgroundColor: '#555555',
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(8, ${TILE_SIZE}px)`,
            gridTemplateRows: `repeat(8, ${TILE_SIZE}px)`,
            gap: `${BORDER_SIZE}px`,
          }}
        >
          {MAP_TILES.map((row, y) =>
            row.map((tile, x) => (
              <div
                key={`${x}-${y}`}
                className="cursor-pointer transition-colors"
                style={{
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  backgroundColor: TILE_COLORS[tile],
                  cursor: tile === 'water' ? 'not-allowed' : 'pointer',
                }}
                onClick={() => handleTileClick(x, y)}
              />
            ))
          )}
        </div>

        <motion.div
          className="absolute flex items-center justify-center text-2xl"
          style={{
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            color: '#4A90D9',
            fontWeight: 'bold',
          }}
          animate={{
            x: state.position.x * (TILE_SIZE + BORDER_SIZE) + (TILE_SIZE - PLAYER_SIZE) / 2 + BORDER_SIZE,
            y: state.position.y * (TILE_SIZE + BORDER_SIZE) + (TILE_SIZE - PLAYER_SIZE) / 2 + BORDER_SIZE,
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          initial={{ opacity: 0 }}
          exit={{ opacity: 0 }}
        >
          ▶
        </motion.div>
      </div>

      <div className="mt-6 p-4 rounded-lg w-full max-w-md" style={{ backgroundColor: '#16213E' }}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#E0E0E0' }}>背包 ({backpackCreatures.length}/6)</h3>
        <div className="flex flex-wrap gap-2">
          {backpackCreatures.length === 0 ? (
            <p style={{ color: '#9B9B9B' }}>背包空空如也，快去探索地图捕获妖怪吧！</p>
          ) : (
            backpackCreatures.map((creature) => (
              <div
                key={creature.id}
                className="flex items-center gap-1 px-2 py-1 rounded text-sm"
                style={{ backgroundColor: '#1A1A2E', color: '#E0E0E0' }}
              >
                <span>{creature.emoji}</span>
                <span>{creature.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {state.currentEncounter && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50"
            initial={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
            animate={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            exit={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="p-6 rounded-xl max-w-sm w-full mx-4"
              style={{ backgroundColor: '#16213E' }}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              <div className="text-center">
                <h3 className="text-xl font-bold mb-4" style={{ color: '#E0E0E0' }}>
                  野生妖怪出现了！
                </h3>

                <div className="text-6xl mb-4">{state.currentEncounter.emoji}</div>

                <h4 className="text-2xl font-bold mb-2" style={{ color: '#E0E0E0' }}>
                  {state.currentEncounter.name}
                </h4>

                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-2"
                  style={{
                    backgroundColor: TYPE_COLORS[state.currentEncounter.type],
                    color: '#fff',
                  }}
                >
                  {state.currentEncounter.type === 'grass' ? '草' : state.currentEncounter.type === 'fire' ? '火' : '水'}
                </span>

                <div className="text-xl mb-4" style={{ color: '#FFD700' }}>
                  {renderStars(state.currentEncounter.stars)}
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1" style={{ color: '#E0E0E0' }}>
                    <span>HP</span>
                    <span>{state.encounterHp} / {state.currentEncounter.hp}</span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#333' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: '#FF4444' }}
                      initial={{ width: '100%' }}
                      animate={{ width: `${(state.encounterHp / state.currentEncounter.hp) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  </div>
                </div>

                {catchMessage && (
                  <motion.div
                    className="text-lg font-bold mb-4"
                    style={{ color: catchMessage.includes('成功') ? '#FFD700' : '#FF4444' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    {catchMessage}
                  </motion.div>
                )}

                {!catchMessage && (
                  <div className="flex gap-3 justify-center">
                    <button
                      className="px-6 py-2 rounded-lg font-medium transition-all"
                      style={{
                        backgroundColor: '#0F3460',
                        color: '#E0E0E0',
                      }}
                      onClick={handleCatch}
                      whileHover={{ backgroundColor: '#1a4a85' }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      捕获
                    </button>
                    <button
                      className="px-6 py-2 rounded-lg font-medium transition-all"
                      style={{
                        backgroundColor: '#555555',
                        color: '#E0E0E0',
                      }}
                      onClick={clearEncounter}
                      whileHover={{ backgroundColor: '#666666' }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      逃跑
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCatchFlash && (
          <motion.div
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, times: [0, 0.2, 0.8, 1] }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBackpackFull && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="p-6 rounded-xl max-w-md w-full mx-4"
              style={{ backgroundColor: '#16213E' }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <h3 className="text-xl