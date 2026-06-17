import React, { useState, useEffect, useCallback, useRef } from 'react';
import HexGrid from './components/HexGrid';
import UnitPanel from './components/UnitPanel';
import { generateMap } from './utils/MapGenerator';
import { runSimulation } from './engine/BattleSimulator';
import {
  TerrainHex,
  Unit,
  UnitType,
  Faction,
  EngagementBehavior,
  HexCoord,
  MovePath,
  UNIT_STATS,
  TurnState,
  SimulationResult,
  AttackEvent,
} from './types';
import { coordKey, hexDistance } from './utils/hexUtils';

const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const HEX_SIZE = 30;
const MAX_UNITS_PER_FACTION = 10;

const App: React.FC = () => {
  const [terrainData, setTerrainData] = useState<TerrainHex[]>([]);
  const [terrainDensity, setTerrainDensity] = useState(50);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<Faction>('blue');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [movePaths, setMovePaths] = useState<MovePath[]>([]);
  const [pathWaypoints, setPathWaypoints] = useState<HexCoord[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [engagementBehavior, setEngagementBehavior] = useState<EngagementBehavior>('attack');
  const [battleReport, setBattleReport] = useState<{ turn: number; destroyed: Unit[] } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [highlightedUnitId, setHighlightedUnitId] = useState<string | null>(null);
  const [mapOpacity, setMapOpacity] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const animationRef = useRef<number | null>(null);
  const unitIdCounter = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 800);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    regenerateMap();
  }, []);

  const regenerateMap = useCallback(() => {
    const terrain = generateMap(MAP_WIDTH, MAP_HEIGHT, terrainDensity);
    setTerrainData(terrain);
  }, [terrainDensity]);

  useEffect(() => {
    if (terrainData.length > 0) {
      regenerateMap();
    }
  }, [terrainDensity]);

  const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;

  const generateUnitId = (): string => {
    unitIdCounter.current += 1;
    return `unit-${Date.now()}-${unitIdCounter.current}`;
  };

  const getUnitAtPosition = (q: number, r: number): Unit | undefined => {
    return units.find((u) => u.q === q && u.r === r && !u.isDestroyed);
  };

  const handleHexClick = (q: number, r: number) => {
    if (isSimulating || isReplayMode) return;

    const unitAtPosition = getUnitAtPosition(q, r);

    if (selectedUnitType && !unitAtPosition) {
      const factionUnitCount = units.filter((u) => u.faction === selectedFaction).length;
      if (factionUnitCount >= MAX_UNITS_PER_FACTION) {
        return;
      }

      const stats = UNIT_STATS[selectedUnitType];
      const newUnit: Unit = {
        id: generateUnitId(),
        type: selectedUnitType,
        faction: selectedFaction,
        q,
        r,
        hp: stats.hp,
        maxHp: stats.hp,
        attack: stats.attack,
        range: stats.range,
        moveCost: stats.moveCost,
        behavior: 'attack',
        isDestroyed: false,
      };

      setUnits((prev) => [...prev, newUnit]);
      setSelectedUnitId(newUnit.id);
      return;
    }

    if (selectedUnitId && selectedUnit) {
      const lastWaypoint =
        pathWaypoints.length > 0
          ? pathWaypoints[pathWaypoints.length - 1]
          : { q: selectedUnit.q, r: selectedUnit.r };

      const dist = hexDistance(lastWaypoint, { q, r });
      if (dist === 1) {
        setPathWaypoints((prev) => [...prev, { q, r }]);
        return;
      }
    }

    if (unitAtPosition) {
      setSelectedUnitId(unitAtPosition.id);
      setPathWaypoints([]);
      return;
    }

    setSelectedUnitId(null);
    setPathWaypoints([]);
  };

  const handleHexRightClick = (q: number, r: number) => {
    if (isSimulating || isReplayMode) return;

    if (selectedUnitId && pathWaypoints.length > 0) {
      setMovePaths((prev) => {
        const existing = prev.findIndex((p) => p.unitId === selectedUnitId);
        const newPath: MovePath = {
          unitId: selectedUnitId,
          waypoints: [...pathWaypoints],
        };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newPath;
          return updated;
        }
        return [...prev, newPath];
      });
      setPathWaypoints([]);
    }
  };

  const handleUnitClick = (unitId: string) => {
    if (isSimulating || isReplayMode) return;
    setSelectedUnitId(unitId);
    setPathWaypoints([]);
  };

  const handleSelectUnitType = (type: UnitType | null) => {
    setSelectedUnitType(type);
    if (type) {
      setSelectedUnitId(null);
      setPathWaypoints([]);
    }
  };

  const handleSelectUnit = (unitId: string | null) => {
    setSelectedUnitId(unitId);
    setPathWaypoints([]);
    if (unitId) {
      const unit = units.find((u) => u.id === unitId);
      if (unit) {
        setSelectedFaction(unit.faction);
        setEngagementBehavior(unit.behavior);
      }
    }
  };

  const handleRemoveUnit = (unitId: string) => {
    setUnits((prev) => prev.filter((u) => u.id !== unitId));
    setMovePaths((prev) => prev.filter((p) => p.unitId !== unitId));
    if (selectedUnitId === unitId) {
      setSelectedUnitId(null);
      setPathWaypoints([]);
    }
  };

  const handleEngagementChange = (behavior: EngagementBehavior) => {
    setEngagementBehavior(behavior);
    if (selectedUnitId) {
      setUnits((prev) =>
        prev.map((u) => (u.id === selectedUnitId ? { ...u, behavior } : u))
      );
    }
  };

  const getCurrentTurnState = (): TurnState | null => {
    if (!simulationResult || !isReplayMode) return null;
    return simulationResult.turns[currentTurnIndex] || null;
  };

  const getDisplayUnits = (): Unit[] => {
    if (isReplayMode && simulationResult) {
      const turnState = simulationResult.turns[currentTurnIndex];
      return turnState ? turnState.units.filter((u) => !u.isDestroyed) : [];
    }
    return units.filter((u) => !u.isDestroyed);
  };

  const getDestroyedUnits = (): Unit[] => {
    if (isReplayMode && simulationResult) {
      const turnState = simulationResult.turns[currentTurnIndex];
      return turnState ? turnState.units.filter((u) => u.isDestroyed) : [];
    }
    return units.filter((u) => u.isDestroyed);
  };

  const getCurrentAttacks = (): AttackEvent[] => {
    if (isReplayMode && simulationResult) {
      const turnState = simulationResult.turns[currentTurnIndex];
      return turnState ? turnState.attacks : [];
    }
    return [];
  };

  const startSimulation = async () => {
    const blueUnits = units.filter((u) => u.faction === 'blue');
    const redUnits = units.filter((u) => u.faction === 'red');

    if (blueUnits.length === 0 || redUnits.length === 0) {
      alert('双方都需要至少部署一个单位才能开始推演！');
      return;
    }

    setIsSimulating(true);
    setMapOpacity(0);

    setTimeout(() => {
      const result = runSimulation(units, terrainData, movePaths, 50);
      setSimulationResult(result);
      setIsReplayMode(true);
      setCurrentTurnIndex(0);
      setMapOpacity(1);
      setIsSimulating(false);
      setShowResultModal(true);

      if (result.turns.length > 0) {
        setBattleReport({
          turn: 0,
          destroyed: [],
        });
      }
    }, 1000);
  };

  const nextTurn = () => {
    if (!simulationResult) return;
    if (currentTurnIndex < simulationResult.turns.length - 1) {
      const nextIdx = currentTurnIndex + 1;
      setCurrentTurnIndex(nextIdx);

      const turnState = simulationResult.turns[nextIdx];
      if (turnState && turnState.destroyedThisTurn.length > 0) {
        setBattleReport({
          turn: nextIdx,
          destroyed: turnState.destroyedThisTurn,
        });
        setTimeout(() => setBattleReport(null), 2000);
      }

      if (turnState && turnState.attacks.length > 0) {
        setHighlightedUnitId(turnState.attacks[0].attackerId);
        setTimeout(() => setHighlightedUnitId(null), 500);
      }
    }
  };

  const prevTurn = () => {
    if (currentTurnIndex > 0) {
      setCurrentTurnIndex(currentTurnIndex - 1);
    }
  };

  const resetSimulation = () => {
    setSimulationResult(null);
    setIsReplayMode(false);
    setCurrentTurnIndex(0);
    setShowResultModal(false);
    setBattleReport(null);
    setHighlightedUnitId(null);
    setUnits((prev) => prev.map((u) => ({ ...u, hp: u.maxHp, isDestroyed: false })));
    setMovePaths([]);
    setPathWaypoints([]);
  };

  const handleTerrainDensityChange = (density: number) => {
    setTerrainDensity(density);
  };

  const getWinnerText = (): string => {
    if (!simulationResult) return '';
    if (simulationResult.winner === 'blue') return '蓝军胜利！';
    if (simulationResult.winner === 'red') return '红军胜利！';
    return '平局';
  };

  const layoutStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '100%',
    padding: isMobile ? '8px' : '16px',
    gap: isMobile ? '8px' : '16px',
    flexDirection: isMobile ? 'column' : 'row',
  };

  const panelStyle: React.CSSProperties = {
    width: isMobile ? '100%' : '15%',
    minWidth: isMobile ? 'auto' : '200px',
    flexShrink: 0,
  };

  const mapContainerStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    position: 'relative',
    opacity: mapOpacity,
    transition: 'opacity 1s ease-in-out',
  };

  return (
    <div style={layoutStyle}>
      {!isMobile && (
        <div style={panelStyle}>
          <UnitPanel
            faction="blue"
            unitTypes={['infantry', 'tank', 'artillery']}
            selectedUnitType={selectedFaction === 'blue' ? selectedUnitType : null}
            selectedUnit={selectedUnit?.faction === 'blue' ? selectedUnit : null}
            deployedUnits={units}
            maxUnits={MAX_UNITS_PER_FACTION}
            isSimulating={isSimulating || isReplayMode}
            engagementBehavior={engagementBehavior}
            terrainDensity={terrainDensity}
            onSelectUnitType={(type) => {
              setSelectedFaction('blue');
              handleSelectUnitType(type);
            }}
            onSelectUnit={handleSelectUnit}
            onRemoveUnit={handleRemoveUnit}
            onEngagementChange={handleEngagementChange}
            onTerrainDensityChange={handleTerrainDensityChange}
            onRegenerateMap={regenerateMap}
            onStartSimulation={startSimulation}
            onResetSimulation={resetSimulation}
          />
        </div>
      )}

      {isMobile && (
        <>
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            style={{
              padding: '8px 16px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid #8B7355',
              color: '#e0e0e0',
              borderRadius: '6px',
              fontFamily: "'Roboto Mono', monospace",
            }}
          >
            {leftPanelOpen ? '收起蓝军面板 ▲' : '展开蓝军面板 ▼'}
          </button>
          {leftPanelOpen && (
            <UnitPanel
              faction="blue"
              unitTypes={['infantry', 'tank', 'artillery']}
              selectedUnitType={selectedFaction === 'blue' ? selectedUnitType : null}
              selectedUnit={selectedUnit?.faction === 'blue' ? selectedUnit : null}
              deployedUnits={units}
              maxUnits={MAX_UNITS_PER_FACTION}
              isSimulating={isSimulating || isReplayMode}
              engagementBehavior={engagementBehavior}
              terrainDensity={terrainDensity}
              onSelectUnitType={(type) => {
                setSelectedFaction('blue');
                handleSelectUnitType(type);
              }}
              onSelectUnit={handleSelectUnit}
              onRemoveUnit={handleRemoveUnit}
              onEngagementChange={handleEngagementChange}
              onTerrainDensityChange={handleTerrainDensityChange}
              onRegenerateMap={regenerateMap}
              onStartSimulation={startSimulation}
              onResetSimulation={resetSimulation}
            />
          )}
        </>
      )}

      <div style={mapContainerStyle}>
        <div
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            border: '2px solid #8B7355',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <HexGrid
            terrainData={terrainData}
            unitData={getDisplayUnits()}
            hexSize={HEX_SIZE}
            mapWidth={MAP_WIDTH}
            mapHeight={MAP_HEIGHT}
            selectedUnitId={selectedUnitId}
            movePaths={isReplayMode ? [] : movePaths}
            pathWaypoints={isReplayMode ? [] : pathWaypoints}
            isSimulating={isSimulating}
            currentTurnAttacks={getCurrentAttacks()}
            highlightedUnitId={highlightedUnitId}
            destroyedUnits={getDestroyedUnits()}
            onHexClick={handleHexClick}
            onHexRightClick={handleHexRightClick}
            onUnitClick={handleUnitClick}
          />

          {battleReport && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid #8B7355',
                borderRadius: '6px',
                padding: '12px 16px',
                fontSize: '12px',
                color: '#e0e0e0',
                minWidth: '180px',
              }}
            >
              <div style={{ fontWeight: '700', color: '#FF9800', marginBottom: '6px' }}>
                第 {battleReport.turn} 回合战报
              </div>
              <div style={{ color: '#F44336' }}>
                击毁: {battleReport.destroyed.length} 个单位
              </div>
              {battleReport.destroyed.slice(0, 3).map((u) => (
                <div key={u.id} style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>
                  {u.faction === 'blue' ? '蓝军' : '红军'} {u.type === 'infantry' ? '步兵' : u.type === 'tank' ? '坦克' : '炮兵'}
                </div>
              ))}
            </div>
          )}

          {isReplayMode && simulationResult && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid #8B7355',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '700',
                color: '#4CAF50',
              }}
            >
              回合 {currentTurnIndex} / {simulationResult.totalTurns}
            </div>
          )}
        </div>

        {isReplayMode && simulationResult && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '0 0 10px 10px',
              borderTop: '1px solid #8B7355',
            }}
          >
            <button
              onClick={prevTurn}
              disabled={currentTurnIndex === 0}
              style={{
                padding: '8px 24px',
                background: currentTurnIndex === 0 ? 'rgba(100, 100, 100, 0.3)' : 'rgba(50, 70, 50, 0.6)',
                border: `2px solid ${currentTurnIndex === 0 ? '#555' : '#5a6a5a'}`,
                color: currentTurnIndex === 0 ? '#666' : '#e0e0e0',
                fontFamily: "'Roboto Mono', monospace",
                fontSize: '12px',
                cursor: currentTurnIndex === 0 ? 'not-allowed' : 'pointer',
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                transition: 'all 0.1s',
              }}
            >
              ◀ 上一步
            </button>
            <button
              onClick={nextTurn}
              disabled={currentTurnIndex >= simulationResult.turns.length - 1}
              style={{
                padding: '8px 24px',
                background: currentTurnIndex >= simulationResult.turns.length - 1 ? 'rgba(100, 100, 100, 0.3)' : 'rgba(76, 175, 80, 0.3)',
                border: `2px solid ${currentTurnIndex >= simulationResult.turns.length - 1 ? '#555' : '#4CAF50'}`,
                color: currentTurnIndex >= simulationResult.turns.length - 1 ? '#666' : '#e0e0e0',
                fontFamily: "'Roboto Mono', monospace",
                fontSize: '12px',
                cursor: currentTurnIndex >= simulationResult.turns.length - 1 ? 'not-allowed' : 'pointer',
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                transition: 'all 0.1s',
              }}
            >
              下一步 ▶
            </button>
          </div>
        )}
      </div>

      {!isMobile && (
        <div style={panelStyle}>
          <UnitPanel
            faction="red"
            unitTypes={['infantry', 'tank', 'artillery']}
            selectedUnitType={selectedFaction === 'red' ? selectedUnitType : null}
            selectedUnit={selectedUnit?.faction === 'red' ? selectedUnit : null}
            deployedUnits={units}
            maxUnits={MAX_UNITS_PER_FACTION}
            isSimulating={isSimulating || isReplayMode}
            engagementBehavior={engagementBehavior}
            terrainDensity={terrainDensity}
            onSelectUnitType={(type) => {
              setSelectedFaction('red');
              handleSelectUnitType(type);
            }}
            onSelectUnit={handleSelectUnit}
            onRemoveUnit={handleRemoveUnit}
            onEngagementChange={handleEngagementChange}
            onTerrainDensityChange={() => {}}
            onRegenerateMap={() => {}}
            onStartSimulation={() => {}}
            onResetSimulation={() => {}}
          />
        </div>
      )}

      {isMobile && (
        <>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            style={{
              padding: '8px 16px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid #8B7355',
              color: '#e0e0e0',
              borderRadius: '6px',
              fontFamily: "'Roboto Mono', monospace",
            }}
          >
            {rightPanelOpen ? '收起红军面板 ▲' : '展开红军面板 ▼'}
          </button>
          {rightPanelOpen && (
            <UnitPanel
              faction="red"
              unitTypes={['infantry', 'tank', 'artillery']}
              selectedUnitType={selectedFaction === 'red' ? selectedUnitType : null}
              selectedUnit={selectedUnit?.faction === 'red' ? selectedUnit : null}
              deployedUnits={units}
              maxUnits={MAX_UNITS_PER_FACTION}
              isSimulating={isSimulating || isReplayMode}
              engagementBehavior={engagementBehavior}
              terrainDensity={terrainDensity}
              onSelectUnitType={(type) => {
                setSelectedFaction('red');
                handleSelectUnitType(type);
              }}
              onSelectUnit={handleSelectUnit}
              onRemoveUnit={handleRemoveUnit}
              onEngagementChange={handleEngagementChange}
              onTerrainDensityChange={() => {}}
              onRegenerateMap={() => {}}
              onStartSimulation={() => {}}
              onResetSimulation={() => {}}
            />
          )}
        </>
      )}

      {showResultModal && simulationResult && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowResultModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1A2A1A 0%, #2E4A2E 100%)',
              border: '3px solid #8B7355',
              borderRadius: '12px',
              padding: '32px 48px',
              textAlign: 'center',
              minWidth: '360px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color:
                  simulationResult.winner === 'blue'
                    ? '#1565C0'
                    : simulationResult.winner === 'red'
                    ? '#D32F2F'
                    : '#FF9800',
                marginBottom: '20px',
                letterSpacing: '2px',
              }}
            >
              {getWinnerText()}
            </h2>
            <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '16px' }}>
              总回合数: <span style={{ color: '#4CAF50', fontWeight: '700' }}>{simulationResult.totalTurns}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', margin: '24px 0' }}>
              <div>
                <div style={{ color: '#1565C0', fontSize: '16px', fontWeight: '700' }}>蓝军存活</div>
                <div style={{ color: '#4CAF50', fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>
                  {simulationResult.turns[simulationResult.turns.length - 1]?.units.filter(
                    (u) => u.faction === 'blue' && !u.isDestroyed
                  ).length || 0}
                </div>
              </div>
              <div>
                <div style={{ color: '#D32F2F', fontSize: '16px', fontWeight: '700' }}>红军存活</div>
                <div style={{ color: '#4CAF50', fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>
                  {simulationResult.turns[simulationResult.turns.length - 1]?.units.filter(
                    (u) => u.faction === 'red' && !u.isDestroyed
                  ).length || 0}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowResultModal(false)}
              style={{
                padding: '10px 32px',
                background: 'rgba(76, 175, 80, 0.3)',
                border: '2px solid #4CAF50',
                color: '#e0e0e0',
                fontFamily: "'Roboto Mono', monospace",
                fontSize: '14px',
                cursor: 'pointer',
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                transition: 'all 0.1s',
              }}
            >
              查看复盘
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
