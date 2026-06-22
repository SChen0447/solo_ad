import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plant,
  EnvironmentParams,
  createPlant,
  updatePlant,
  getPlantType,
  PLANT_TYPES
} from './utils/plantEngine';
import { GardenGrid, GardenSlot } from './components/GardenGrid';
import { ControlPanel } from './components/ControlPanel';
import { PlantDetailPanel } from './components/PlantDetailPanel';

const GRID_SIZE = 16;

function createInitialSlots(): GardenSlot[] {
  return Array.from({ length: GRID_SIZE }, (_, i) => ({
    index: i,
    plant: null
  }));
}

export const App: React.FC = () => {
  const [slots, setSlots] = useState<GardenSlot[]>(createInitialSlots);
  const [env, setEnv] = useState<EnvironmentParams>({
    light: 70,
    water: 60,
    temperature: 25
  });
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  const slotsRef = useRef(slots);
  const envRef = useRef(env);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const lastTrendUpdateRef = useRef<number>(0);
  const lastSecondRef = useRef<number>(0);

  slotsRef.current = slots;
  envRef.current = env;

  const selectedPlant = slots.find(s => s.plant?.id === selectedPlantId)?.plant || null;

  const gameLoop = useCallback((now: number) => {
    const deltaMs = now - lastTimeRef.current;
    lastTimeRef.current = now;

    if (deltaMs > 0) {
      const currentSlots = slotsRef.current;
      const currentEnv = envRef.current;
      let hasChanges = false;

      const newSlots = currentSlots.map(slot => {
        if (!slot.plant || slot.plant.isWithered) return slot;

        const result = updatePlant(slot.plant, currentEnv, deltaMs);
        const plant = slot.plant;

        if (
          result.stage !== plant.stage ||
          Math.abs(result.growthProgress - plant.growthProgress) > 0.01 ||
          Math.abs(result.health - plant.health) > 0.5 ||
          result.stageChanged ||
          result.isWithered !== plant.isWithered
        ) {
          hasChanges = true;

          let newHealthTrend = plant.healthTrend;
          if (now - lastTrendUpdateRef.current >= 100) {
            newHealthTrend = [...plant.healthTrend, result.health];
            if (newHealthTrend.length > 120) {
              newHealthTrend = newHealthTrend.slice(-120);
            }
            lastTrendUpdateRef.current = now;
          }

          const newHistory = result.newHistory
            ? [...plant.history, result.newHistory]
            : plant.history;

          let stageAnimating = plant.stageAnimating;
          let newStageStartedAt = plant.stageStartedAt;

          if (result.stageChanged) {
            stageAnimating = true;
            newStageStartedAt = result.newHistory?.timestamp || Date.now();
            setTimeout(() => {
              setSlots(prev =>
                prev.map(s =>
                  s.plant?.id === plant.id
                    ? { ...s, plant: { ...s.plant!, stageAnimating: false } }
                    : s
                )
              );
            }, 800);
          }

          return {
            ...slot,
            plant: {
              ...plant,
              stage: result.stage,
              growthProgress: result.growthProgress,
              health: result.health,
              isWithered: result.isWithered,
              stageAnimating,
              healthTrend: newHealthTrend,
              history: newHistory,
              stageStartedAt: newStageStartedAt
            }
          };
        }
        return slot;
      });

      if (now - lastSecondRef.current >= 1000) {
        lastSecondRef.current = now;
        forceRender(x => x + 1);
      }

      if (hasChanges) {
        setSlots(newSlots);
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    lastTrendUpdateRef.current = performance.now();
    lastSecondRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [gameLoop]);

  const handlePlacePlant = (typeId: string, slotIndex: number) => {
    setSlots(prev =>
      prev.map((s, i) =>
        i === slotIndex && !s.plant
          ? { ...s, plant: createPlant(typeId) }
          : s
      )
    );
  };

  const handlePlantMove = (fromIndex: number, toIndex: number) => {
    setSlots(prev => {
      const newSlots = [...prev];
      const fromSlot = newSlots[fromIndex];
      const toSlot = newSlots[toIndex];
      newSlots[fromIndex] = { ...fromSlot, index: fromIndex, plant: toSlot.plant };
      newSlots[toIndex] = { ...toSlot, index: toIndex, plant: fromSlot.plant };
      return newSlots;
    });
  };

  const handleClearWithered = () => {
    setSlots(prev =>
      prev.map(s =>
        s.plant?.isWithered ? { ...s, plant: null } : s
      )
    );
    if (selectedPlant?.isWithered) {
      setSelectedPlantId(null);
    }
  };

  const handleRemovePlant = (plantId: string) => {
    setSlots(prev =>
      prev.map(s => (s.plant?.id === plantId ? { ...s, plant: null } : s))
    );
    setSelectedPlantId(null);
  };

  const totalPlants = slots.filter(s => s.plant && !s.plant.isWithered).length;
  const witheredCount = slots.filter(s => s.plant?.isWithered).length;
  const avgHealth = totalPlants > 0
    ? Math.round(
        slots
          .filter(s => s.plant && !s.plant.isWithered)
          .reduce((acc, s) => acc + (s.plant?.health || 0), 0) / totalPlants
      )
    : 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">🌱</span>
            植物培育模拟器
          </h1>
          <p className="app-subtitle">在虚拟花园中种植、观察并记录植物的生长过程</p>
        </div>
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-icon">🪴</span>
            <div>
              <span className="stat-label">存活植物</span>
              <span className="stat-value">{totalPlants} 株</span>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">💚</span>
            <div>
              <span className="stat-label">平均健康度</span>
              <span className="stat-value" style={{ color: avgHealth >= 60 ? '#10b981' : avgHealth >= 30 ? '#f59e0b' : '#ef4444' }}>
                {totalPlants > 0 ? `${avgHealth}%` : '—'}
              </span>
            </div>
          </div>
          {witheredCount > 0 && (
            <div className="stat-item">
              <span className="stat-icon">🥀</span>
              <div>
                <span className="stat-label">已枯萎</span>
                <span className="stat-value" style={{ color: '#94a3b8' }}>{witheredCount} 株</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <section className="garden-section">
          <div className="section-header">
            <h2><span>🏡</span> 我的花园</h2>
            <span className="section-hint">点击空槽位种植，长按植物卡片可拖拽移动</span>
          </div>
          <GardenGrid
            slots={slots}
            onSlotClick={() => {}}
            onPlantClick={(plantId) => setSelectedPlantId(plantId)}
            onPlantMove={handlePlantMove}
            onSelectPlantType={handlePlacePlant}
          />
        </section>

        <aside className="sidebar">
          <ControlPanel
            params={env}
            onChange={setEnv}
            onClearWithered={witheredCount > 0 ? handleClearWithered : undefined}
          />

          <div className="plant-guide">
            <h3><span>📖</span> 植物图鉴</h3>
            <div className="guide-list">
              {PLANT_TYPES.map(pt => (
                <div key={pt.id} className="guide-item" style={{ borderLeftColor: pt.color }}>
                  <span className="guide-icon">{pt.icon}</span>
                  <div className="guide-info">
                    <span className="guide-name">{pt.name}</span>
                    <div className="guide-prefs">
                      <span title={`理想光照 ${pt.preferences.idealLight}%`}>☀️{pt.preferences.idealLight}</span>
                      <span title={`理想水分 ${pt.preferences.idealWater}%`}>💧{pt.preferences.idealWater}</span>
                      <span title={`理想温度 ${pt.preferences.idealTemperature}°C`}>🌡️{pt.preferences.idealTemperature}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <PlantDetailPanel
        plant={selectedPlant}
        env={env}
        onClose={() => setSelectedPlantId(null)}
        onRemove={handleRemovePlant}
      />

      <style>{`
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
            'Microsoft YaHei', Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        body {
          background: #f0fdf4;
        }
        #root {
          min-height: 100vh;
        }
        .app {
          min-height: 100vh;
          background: #f0fdf4;
          color: #1e293b;
        }
        .app-header {
          background: linear-gradient(135deg, #059669, #10b981, #34d399);
          color: white;
          padding: 28px 24px 24px;
          position: relative;
          overflow: hidden;
        }
        .app-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%);
          pointer-events: none;
        }
        .app-header::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -5%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%);
          pointer-events: none;
        }
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .app-title {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .title-icon {
          font-size: 32px;
          animation: bounce 2s ease-in-out infinite;
          display: inline-block;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .app-subtitle {
          margin: 8px 0 0 0;
          font-size: 14px;
          opacity: 0.92;
        }
        .stats-bar {
          max-width: 1200px;
          margin: 20px auto 0;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .stat-item {
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .stat-icon { font-size: 22px; }
        .stat-item div {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 11px;
          opacity: 0.9;
        }
        .stat-value {
          font-size: 16px;
          font-weight: 700;
        }
        .app-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .garden-section {
          flex: 1;
          min-width: 300px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
          padding: 0 16px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .section-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #065f46;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-hint {
          font-size: 12px;
          color: #64748b;
        }
        .sidebar {
          width: 340px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .plant-guide {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .plant-guide h3 {
          margin: 0 0 14px 0;
          font-size: 16px;
          font-weight: 700;
          color: #065f46;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .guide-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .guide-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: #f8fafc;
          border-radius: 10px;
          border-left: 4px solid;
        }
        .guide-icon { font-size: 24px; }
        .guide-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .guide-name {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }
        .guide-prefs {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #64748b;
        }
        .guide-prefs span {
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        @media (max-width: 900px) {
          .app-main {
            flex-direction: column;
            padding: 16px;
          }
          .sidebar {
            width: 100%;
          }
          .stats-bar {
            flex-direction: column;
            align-items: flex-start;
          }
        }
        @media (max-width: 480px) {
          .app-header {
            padding: 20px 16px 16px;
          }
          .app-title {
            font-size: 22px;
          }
          .title-icon { font-size: 26px; }
          .app-main { padding: 12px; }
          .section-header { padding: 0 8px; }
          .section-header h2 { font-size: 17px; }
          .section-hint { font-size: 11px; }
        }
      `}</style>
    </div>
  );
};

export default App;
