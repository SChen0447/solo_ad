import { useState, useEffect, useMemo, useCallback } from 'react';
import { CircuitBoard } from './components/CircuitBoard';
import { GatePalette } from './components/GatePalette';
import { useCircuitSimulation } from './hooks/useCircuitSimulation';
import { LEVELS, getTotalLevels } from './utils/levelData';
import type { Gate, Switch, Wire, GateType } from './types';

const STORAGE_KEY = 'logic-gate-puzzle-progress';

function loadProgress(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return parseInt(saved, 10) || 1;
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
  return 1;
}

function saveProgress(level: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(level));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

export function App() {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);
  const [selectedGateType, setSelectedGateType] = useState<GateType | null>(null);
  const [showWinAnimation, setShowWinAnimation] = useState(false);

  const level = LEVELS.find((l) => l.id === currentLevel) || LEVELS[0];

  const [gates, setGates] = useState<Gate[]>([]);
  const [switches, setSwitches] = useState<Switch[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const lights = level.lights;

  useEffect(() => {
    const saved = loadProgress();
    setMaxUnlockedLevel(saved);
  }, []);

  useEffect(() => {
    setGates([...level.fixedGates]);
    setSwitches(level.switches.map((sw) => ({ ...sw })));
    setWires([]);
    setSelectedGateType(null);
    setShowWinAnimation(false);
  }, [currentLevel, level]);

  const { lightStates } = useCircuitSimulation(gates, switches, lights, wires);

  const isLevelComplete = useMemo(() => {
    return lightStates.length > 0 && lightStates.every((l) => l.state);
  }, [lightStates]);

  useEffect(() => {
    if (isLevelComplete && !showWinAnimation) {
      setShowWinAnimation(true);

      const nextLevel = currentLevel + 1;
      if (nextLevel > maxUnlockedLevel && nextLevel <= getTotalLevels()) {
        setMaxUnlockedLevel(nextLevel);
        saveProgress(nextLevel);
      }

      const timer = setTimeout(() => {
        setShowWinAnimation(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isLevelComplete, showWinAnimation, currentLevel, maxUnlockedLevel]);

  const placedGatesCount = useMemo(() => {
    const counts: Record<GateType, number> = { AND: 0, OR: 0, NOT: 0 };
    for (const gate of gates) {
      if (!gate.isFixed) {
        counts[gate.type]++;
      }
    }
    return counts;
  }, [gates]);

  const handleGatePlaced = useCallback(() => {
    setSelectedGateType(null);
  }, []);

  const handleReset = useCallback(() => {
    setGates(level.fixedGates.filter((g) => g.isFixed));
    setSwitches(level.switches.map((sw) => ({ ...sw, state: false })));
    setWires([]);
    setSelectedGateType(null);
    setShowWinAnimation(false);
  }, [level]);

  const handleNextLevel = useCallback(() => {
    if (currentLevel < maxUnlockedLevel && currentLevel < getTotalLevels()) {
      setCurrentLevel(currentLevel + 1);
    }
  }, [currentLevel, maxUnlockedLevel]);

  const canGoNext = currentLevel < maxUnlockedLevel && currentLevel < getTotalLevels();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">逻辑门电路解谜</h1>
        <p className="level-description">{level.description}</p>
      </header>

      <main className="game-area">
        <GatePalette
          availableGates={level.availableGates}
          selectedGate={selectedGateType}
          onSelectGate={setSelectedGateType}
          placedGatesCount={placedGatesCount}
        />

        <div className="board-container">
          <CircuitBoard
            gates={gates}
            switches={switches}
            lights={lights}
            wires={wires}
            onGatesChange={setGates}
            onSwitchesChange={setSwitches}
            onWiresChange={setWires}
            selectedGateType={selectedGateType}
            onGatePlaced={handleGatePlaced}
            gridSize={level.gridSize}
            cellSize={level.cellSize}
          />

          <div className="controls-bar">
            <div className="level-info">第{currentLevel}关</div>
            <div className="controls-buttons">
              <button className="btn btn-reset" onClick={handleReset}>
                重置
              </button>
              <button
                className={`btn btn-next ${canGoNext ? '' : 'disabled'}`}
                onClick={handleNextLevel}
                disabled={!canGoNext}
              >
                下一关
              </button>
            </div>
          </div>
        </div>
      </main>

      {showWinAnimation && (
        <div className="win-overlay">
          <div className="win-message">🎉 恭喜通关！</div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .app-container {
          min-height: 100vh;
          background: radial-gradient(circle at center, #2d3748 0%, #1a202c 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
        }

        .app-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .app-title {
          color: #f6e05e;
          font-size: 28px;
          margin: 0 0 8px 0;
          text-shadow: 0 2px 10px rgba(246, 224, 94, 0.3);
        }

        .level-description {
          color: #a0aec0;
          font-size: 14px;
          margin: 0;
          max-width: 600px;
        }

        .game-area {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .board-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px;
        }

        .level-info {
          color: #a0aec0;
          font-size: 16px;
          font-weight: 600;
        }

        .controls-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex: 1;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.2s ease;
          width: 100px;
        }

        .btn:active {
          transform: scale(0.95);
        }

        .btn-reset {
          background: #e53e3e;
          color: white;
        }

        .btn-reset:hover {
          background: #c53030;
        }

        .btn-next {
          background: #3182ce;
          color: white;
        }

        .btn-next:hover:not(.disabled) {
          background: #2b6cb0;
        }

        .btn-next.disabled {
          background: #718096;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .win-overlay {
          position: fixed;
          bottom: 50px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          animation: slideUp 0.5s ease-out;
        }

        .win-message {
          background: #68d391;
          color: #1a202c;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 20px;
          font-weight: bold;
          box-shadow: 0 4px 20px rgba(104, 211, 145, 0.4);
          animation: bounce 0.5s ease-out 0.2s both;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @media (max-width: 900px) {
          .game-area {
            flex-direction: column;
            align-items: center;
          }

          .app-title {
            font-size: 22px;
          }

          .level-description {
            font-size: 12px;
          }

          .controls-bar {
            flex-direction: column;
            gap: 10px;
          }

          .controls-buttons {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
