import { useCallback, useState } from 'react';
import Sidebar from '@/Sidebar';
import PhysicsScene from '@/PhysicsScene';
import ResultPanel from '@/ResultPanel';
import { BlockData, MaterialType, SimulationStats } from '@/types';
import { generateScene } from '@/utils';

const SCENE_WIDTH = 800;
const SCENE_HEIGHT = 600;

export default function App() {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType | null>(null);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [simulationResetKey, setSimulationResetKey] = useState(0);
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  if (typeof window !== 'undefined') {
    window.onresize = () => {
      setIsNarrow(window.innerWidth < 1024);
    };
  }

  const handleSelectMaterial = useCallback((material: MaterialType) => {
    setSelectedMaterial(material);
  }, []);

  const handleLoadScene = useCallback((type: 'mirror' | 'spiral' | 'random') => {
    const newBlocks = generateScene(type, SCENE_WIDTH, SCENE_HEIGHT);
    setBlocks(newBlocks);
    setStats(null);
    setShowResult(false);
    setSimulationResetKey((k) => k + 1);
  }, []);

  const handleAddBlock = useCallback((block: BlockData) => {
    setBlocks((prev) => [...prev, block]);
  }, []);

  const handleStatsUpdate = useCallback((newStats: SimulationStats | null) => {
    setStats(newStats);
  }, []);

  const handleShowResult = useCallback((show: boolean) => {
    setShowResult(show);
  }, []);

  const handleReset = useCallback(() => {
    setStats(null);
    setShowResult(false);
    setSimulationResetKey((k) => k + 1);
  }, []);

  const handlePlaceBlock = useCallback((block: BlockData) => {
    handleAddBlock(block);
  }, [handleAddBlock]);

  const sidebarComponent = (
    <Sidebar
      selectedMaterial={selectedMaterial}
      onSelectMaterial={handleSelectMaterial}
      onLoadScene={handleLoadScene}
    />
  );

  const sceneContainerStyle: React.CSSProperties = isNarrow
    ? {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 16,
        gap: 16,
      }
    : {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        padding: 24,
        position: 'relative',
      };

  const layoutStyle: React.CSSProperties = isNarrow
    ? { width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f0f1a' }
    : { width: '100%', height: '100vh', display: 'flex', background: '#0f0f1a' };

  const topBarStyle: React.CSSProperties = isNarrow
    ? {
        width: '100%',
        background: '#1e1e2f',
        borderRadius: 8,
        margin: 12,
        padding: '8px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }
    : {};

  return (
    <div style={layoutStyle}>
      {isNarrow ? (
        <>
          <div style={topBarStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {sidebarComponent}
            </div>
          </div>
          <div style={sceneContainerStyle}>
            <PhysicsScene
              blocks={blocks}
              selectedMaterial={selectedMaterial}
              onStatsUpdate={handleStatsUpdate}
              onShowResult={handleShowResult}
              onReset={handleReset}
              simulationResetKey={simulationResetKey}
              onAddBlock={handlePlaceBlock}
            />
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', padding: 24, gap: 0, alignItems: 'stretch' }}>
            <div style={{ flexShrink: 0 }}>{sidebarComponent}</div>
            <div
              style={{
                width: 2,
                background: '#333355',
                alignSelf: 'stretch',
                margin: '8px 16px',
                borderRadius: 1,
              }}
            />
          </div>
          <div style={sceneContainerStyle}>
            <div
              style={{ position: 'relative', width: SCENE_WIDTH, height: SCENE_HEIGHT, flexShrink: 0 }}
            >
              <PhysicsScene
                blocks={blocks}
                selectedMaterial={selectedMaterial}
                onStatsUpdate={handleStatsUpdate}
                onShowResult={handleShowResult}
                onReset={handleReset}
                simulationResetKey={simulationResetKey}
                onAddBlock={handlePlaceBlock}
              />
              <ResultPanel
                stats={stats}
                visible={showResult}
                onReset={handleReset}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
