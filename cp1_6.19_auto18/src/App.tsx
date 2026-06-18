import React from 'react';
import { MapEditor } from './MapEditor';
import { EnemyAI } from './EnemyAI';
import { EffectManager } from './EffectManager';
import { useGameStore, TRAP_CONFIG } from './store';
import type { TrapType, ToolMode } from './types';

const App: React.FC = () => {
  const phase = useGameStore((s) => s.phase);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const selectedTool = useGameStore((s) => s.selectedTool);
  const selectedTrapType = useGameStore((s) => s.selectedTrapType);
  const logs = useGameStore((s) => s.logs);
  const setSelectedTool = useGameStore((s) => s.setSelectedTool);
  const setSelectedTrapType = useGameStore((s) => s.setSelectedTrapType);
  const clearPath = useGameStore((s) => s.clearPath);
  const resetPath = useGameStore((s) => s.resetPath);
  const startSimulation = useGameStore((s) => s.startSimulation);
  const stopSimulation = useGameStore((s) => s.stopSimulation);
  const resetSimulation = useGameStore((s) => s.resetSimulation);

  const trapTypes: TrapType[] = ['electric', 'poison', 'fire', 'ice'];

  const handleTrapSelect = (type: TrapType) => {
    if (phase !== 'editing') return;
    setSelectedTool('trap');
    setSelectedTrapType(selectedTrapType === type ? null : type);
  };

  const handleModeChange = (mode: ToolMode) => {
    if (phase !== 'editing') return;
    setSelectedTool(mode);
    if (mode !== 'trap') setSelectedTrapType(null);
  };

  return (
    <div className="app-container">
      <EnemyAI />
      <EffectManager />

      <header className="app-header">
        <h1 className="app-title">赛博陷阱 CYBER TRAP</h1>
        <p className="app-subtitle">2D 网格陷阱编辑与触发模拟器</p>
      </header>

      <div className="main-layout">
        <aside className="panel left-panel">
          <div className="tool-section">
            <div className="section-title">编辑模式</div>
            <div className="mode-buttons">
              <button
                className={`mode-btn ${selectedTool === 'trap' ? 'active' : ''}`}
                onClick={() => handleModeChange('trap')}
                disabled={phase !== 'editing'}
              >
                陷阱
              </button>
              <button
                className={`mode-btn ${selectedTool === 'path' ? 'active' : ''}`}
                onClick={() => handleModeChange('path')}
                disabled={phase !== 'editing'}
              >
                路径
              </button>
            </div>
          </div>

          <div className="tool-section">
            <div className="section-title">陷阱类型</div>
            <div className="trap-buttons">
              {trapTypes.map((type) => {
                const cfg = TRAP_CONFIG[type];
                return (
                  <button
                    key={type}
                    data-trap={type}
                    className={`trap-btn ${selectedTrapType === type && selectedTool === 'trap' ? 'active' : ''}`}
                    onClick={() => handleTrapSelect(type)}
                    disabled={phase !== 'editing'}
                    title={`${cfg.name} - 伤害 ${cfg.damage}`}
                  >
                    <span className="trap-icon">{cfg.icon}</span>
                    <span>{cfg.name.replace('陷阱', '')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedTool === 'path' && phase === 'editing' && (
            <div className="tool-section">
              <div className="section-title">路径控制</div>
              <div className="path-controls">
                <button className="path-btn" onClick={clearPath}>清空</button>
                <button className="path-btn" onClick={resetPath}>默认</button>
              </div>
            </div>
          )}

          <div className="tool-section">
            <div className="section-title">操作指南</div>
            <div className="help-tip">
              <div>• 左键：放置陷阱 / 添加路径点</div>
              <div>• 右键：删除陷阱 / 截断路径</div>
              <div>• 点击已放置陷阱：编辑参数</div>
            </div>
          </div>

          <div className="tool-section">
            <div className="section-title">实时日志</div>
            <div className="log-panel">
              {logs.length === 0 ? (
                <div className="log-empty">暂无日志...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={`log-entry type-${log.type}`}>
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="map-area">
          <div className="status-bar">
            <div className="turn-display">
              当前回合<span className="turn-num">{currentTurn}</span>
            </div>
            <div className={`phase-badge ${phase}`}>
              {phase === 'editing' ? '编辑中' : phase === 'simulating' ? '模拟中' : '已结束'}
            </div>
            <div className="control-buttons">
              {phase === 'editing' && (
                <button className="control-btn primary" onClick={startSimulation}>
                  ▶ 启动模拟
                </button>
              )}
              {phase === 'simulating' && (
                <button className="control-btn secondary" onClick={stopSimulation}>
                  ■ 停止
                </button>
              )}
              {phase === 'ended' && (
                <button className="control-btn primary" onClick={resetSimulation}>
                  ↺ 重新开始
                </button>
              )}
              {phase === 'editing' && (
                <button className="control-btn secondary" onClick={resetSimulation}>
                  重置
                </button>
              )}
            </div>
          </div>

          <MapEditor />
        </main>
      </div>
    </div>
  );
};

export default App;
