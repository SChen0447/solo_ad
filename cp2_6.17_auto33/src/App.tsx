import React, { useState, useEffect, useCallback, useRef } from 'react';
import TerrainViewer from './components/TerrainViewer';
import ControlPanel from './components/ControlPanel';
import { HeightMap } from '../server/terrainGenerator';
import { ParticlePath } from '../server/erosionSimulator';

interface SimulationState {
  isSimulating: boolean;
  currentIteration: number;
  totalIterations: number;
  isComplete: boolean;
}

const App: React.FC = () => {
  const [heightMap, setHeightMap] = useState<HeightMap | null>(null);
  const [terrainSize, setTerrainSize] = useState(30);
  const [waterPaths, setWaterPaths] = useState<ParticlePath[]>([]);
  const [simulation, setSimulation] = useState<SimulationState>({
    isSimulating: false,
    currentIteration: 0,
    totalIterations: 30,
    isComplete: false
  });
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const heightMapRef = useRef<HeightMap | null>(null);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsNarrowScreen(window.innerWidth <= 1024);
    };
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  useEffect(() => {
    heightMapRef.current = heightMap;
  }, [heightMap]);

  useEffect(() => {
    const handler = (_e: Event) => {
      const event = new CustomEvent('getHeightMapResponse', {
        detail: { heightMap: heightMapRef.current || [] }
      });
      document.dispatchEvent(event);
    };
    document.addEventListener('getHeightMap', handler);
    return () => document.removeEventListener('getHeightMap', handler);
  }, []);

  const handleTerrainGenerated = useCallback((newHeightMap: HeightMap, size: number) => {
    setHeightMap(newHeightMap);
    setTerrainSize(size);
    setWaterPaths([]);
    setSimulation({
      isSimulating: false,
      currentIteration: 0,
      totalIterations: 30,
      isComplete: false
    });
  }, []);

  const handleErosionIteration = useCallback(
    (newHeightMap: HeightMap, paths: ParticlePath[]) => {
      setHeightMap(newHeightMap);
      setWaterPaths(paths);
    },
    []
  );

  const handleIterationComplete = useCallback(() => {
    setSimulation((prev) => ({
      ...prev,
      isSimulating: false,
      isComplete: true
    }));
    setTimeout(() => {
      setSimulation((prev) => ({ ...prev, isComplete: false }));
    }, 2000);
  }, []);

  const handleSimulatingChange = useCallback((simulating: boolean) => {
    setSimulation((prev) => ({
      ...prev,
      isSimulating: simulating,
      isComplete: false
    }));
  }, []);

  const handleIterationChange = useCallback((iteration: number) => {
    setSimulation((prev) => ({
      ...prev,
      currentIteration: iteration
    }));
  }, []);

  const handleTotalIterationsChange = useCallback((total: number) => {
    setSimulation((prev) => ({
      ...prev,
      totalIterations: total
    }));
  }, []);

  const progressPercent =
    simulation.totalIterations > 0
      ? (simulation.currentIteration / simulation.totalIterations) * 100
      : 0;

  const statusText = !heightMap
    ? '请先生成地形'
    : simulation.isSimulating
    ? `正在模拟水流侵蚀... (${simulation.currentIteration}/${simulation.totalIterations})`
    : simulation.currentIteration > 0
    ? `模拟完成 - 共 ${simulation.currentIteration} 次迭代`
    : '地形已就绪，点击"开始模拟"运行水流侵蚀';

  return (
    <div style={styles.app}>
      <div style={styles.statusBar}>
        <div style={styles.statusBarContent}>
          <span style={styles.statusText}>{statusText}</span>
          <div style={styles.statusProgressContainer}>
            <div
              style={{
                ...styles.statusProgressBar,
                width: `${progressPercent}%`,
                backgroundColor: simulation.isComplete ? '#76ff03' : '#4FC3F7',
                animation: simulation.isComplete ? 'pulse-green 0.5s ease-in-out 3' : 'none'
              }}
            />
          </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.viewerContainer}>
          <TerrainViewer
            heightMap={heightMap}
            size={terrainSize}
            waterPaths={waterPaths}
            isSimulating={simulation.isSimulating}
          />
        </div>

        {!isNarrowScreen && (
          <div style={styles.panelContainer}>
            <ControlPanel
              onTerrainGenerated={handleTerrainGenerated}
              onErosionIteration={handleErosionIteration}
              onIterationComplete={handleIterationComplete}
              currentIteration={simulation.currentIteration}
              totalIterations={simulation.totalIterations}
              isSimulating={simulation.isSimulating}
              onSimulatingChange={handleSimulatingChange}
              onIterationChange={handleIterationChange}
              onTotalIterationsChange={handleTotalIterationsChange}
            />
          </div>
        )}

        {isNarrowScreen && (
          <ControlPanel
            onTerrainGenerated={handleTerrainGenerated}
            onErosionIteration={handleErosionIteration}
            onIterationComplete={handleIterationComplete}
            currentIteration={simulation.currentIteration}
            totalIterations={simulation.totalIterations}
            isSimulating={simulation.isSimulating}
            onSimulatingChange={handleSimulatingChange}
            onIterationChange={handleIterationChange}
            onTotalIterationsChange={handleTotalIterationsChange}
          />
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0d0d1a',
    fontFamily: "'Segoe UI', sans-serif",
    overflow: 'hidden'
  },

  statusBar: {
    height: '48px',
    minHeight: '48px',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid rgba(79, 195, 247, 0.15)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
  },

  statusBarContent: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    maxWidth: '100%'
  },

  statusText: {
    fontSize: '13px',
    color: '#e0e0e0',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    letterSpacing: '0.3px'
  },

  statusProgressContainer: {
    flex: 1,
    height: '6px',
    backgroundColor: '#333',
    borderRadius: '3px',
    overflow: 'hidden',
    maxWidth: '400px'
  },

  statusProgressBar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease, background-color 0.3s ease',
    boxShadow: '0 0 8px rgba(79, 195, 247, 0.5)'
  },

  mainContent: {
    flex: 1,
    display: 'flex',
    marginTop: '48px',
    height: 'calc(100vh - 48px)',
    overflow: 'hidden'
  },

  viewerContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden'
  },

  panelContainer: {
    padding: '20px',
    display: 'flex',
    flexShrink: 0,
    alignItems: 'flex-start'
  }
};

export default App;
