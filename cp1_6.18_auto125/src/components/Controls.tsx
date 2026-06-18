import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { DisplayMode, BuildingShape } from '../modules/windSimulator';
import './Controls.css';

export function Controls() {
  const fps = useAppStore((s) => s.fps);
  const particleCount = useAppStore((s) => s.particleCount);
  const avgWindDirection = useAppStore((s) => s.avgWindDirection);
  const displayMode = useAppStore((s) => s.displayMode);
  const isSimulating = useAppStore((s) => s.isSimulating);
  const buildingHeight = useAppStore((s) => s.buildingHeight);
  const buildingRotation = useAppStore((s) => s.buildingRotation);
  const buildingShapeType = useAppStore((s) => s.buildingShapeType);
  const buildingWidth = useAppStore((s) => s.buildingWidth);
  const buildingDepth = useAppStore((s) => s.buildingDepth);
  const selectedBuildingId = useAppStore((s) => s.selectedBuildingId);
  const isPanelCollapsed = useAppStore((s) => s.isPanelCollapsed);

  const setDisplayMode = useAppStore((s) => s.setDisplayMode);
  const setIsSimulating = useAppStore((s) => s.setIsSimulating);
  const setBuildingHeight = useAppStore((s) => s.setBuildingHeight);
  const setBuildingRotation = useAppStore((s) => s.setBuildingRotation);
  const setBuildingShapeType = useAppStore((s) => s.setBuildingShapeType);
  const setBuildingWidth = useAppStore((s) => s.setBuildingWidth);
  const setBuildingDepth = useAppStore((s) => s.setBuildingDepth);
  const deleteSelectedBuilding = useAppStore((s) => s.deleteSelectedBuilding);
  const togglePanel = useAppStore((s) => s.togglePanel);

  const [isNarrow, setIsNarrow] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1400);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => {
      setRipples((r) => r.filter((ri) => ri.id !== id));
    }, 400);
  };

  const btnRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    handleRipple(e);
  };

  const renderModeBtn = (mode: DisplayMode, label: string, icon: string) => (
    <button
      key={mode}
      className={`mode-btn ${displayMode === mode ? 'active' : ''}`}
      onClick={(e) => {
        btnRipple(e);
        setDisplayMode(mode);
      }}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
    </button>
  );

  const renderShapeBtn = (type: BuildingShape['type'], label: string, icon: string) => (
    <button
      key={type}
      className={`shape-btn ${buildingShapeType === type ? 'active' : ''}`}
      onClick={(e) => {
        btnRipple(e);
        setBuildingShapeType(type);
      }}
    >
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
    </button>
  );

  const collapsed = isPanelCollapsed || isNarrow;

  return (
    <>
      <div className="status-panel">
        <div className="status-item">
          <span className="status-label">粒子数</span>
          <span className="status-value">{particleCount}</span>
        </div>
        <div className="status-item">
          <span className="status-label">风向角</span>
          <span className="status-value">{avgWindDirection.toFixed(1)}°</span>
        </div>
        <div className="status-item">
          <span className="status-label">帧率</span>
          <span className="status-value">{fps} FPS</span>
        </div>
      </div>

      {collapsed ? (
        <button className="panel-toggle-btn" onClick={togglePanel}>
          ☰
        </button>
      ) : null}

      {!collapsed || !isPanelCollapsed ? (
        <div className={`control-panel ${collapsed ? 'collapsed-overlay' : ''}`}>
          <div className="panel-header">
            <span className="panel-title">风场控制台</span>
            {isNarrow && (
              <button className="panel-close-btn" onClick={togglePanel}>
                ×
              </button>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title">显示模式</div>
            <div className="mode-buttons">
              {renderModeBtn('particles', '粒子', '≈')}
              {renderModeBtn('heatmap', '热力图', '▦')}
              {renderModeBtn('vectors', '矢量', '➤')}
            </div>
          </div>

          <div className="panel-section">
            <button
              className={`sim-btn ${isSimulating ? 'running' : ''}`}
              onClick={(e) => {
                btnRipple(e);
                setIsSimulating(!isSimulating);
              }}
            >
              {ripples.map((r) => (
                <span
                  key={r.id}
                  className="ripple"
                  style={{ left: r.x, top: r.y }}
                />
              ))}
              <span className="sim-icon">{isSimulating ? '⏸' : '▶'}</span>
              <span>{isSimulating ? '停止模拟' : '开始模拟'}</span>
            </button>
          </div>

          <div className="panel-section">
            <div className="section-title">
              建筑参数 {selectedBuildingId && <span className="selected-tag">已选中</span>}
            </div>

            <div className="shape-selector">
              {renderShapeBtn('rect', '矩形', '▭')}
              {renderShapeBtn('L', 'L形', '⌊')}
              {renderShapeBtn('U', 'U形', '⊓')}
            </div>

            <div className="slider-row">
              <label className="slider-label">高度: {buildingHeight.toFixed(1)}m</label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={buildingHeight}
                onChange={(e) => setBuildingHeight(parseFloat(e.target.value))}
                className="slider"
              />
            </div>

            <div className="slider-row">
              <label className="slider-label">宽度: {buildingWidth.toFixed(1)}m</label>
              <input
                type="range"
                min="2"
                max="10"
                step="0.5"
                value={buildingWidth}
                onChange={(e) => setBuildingWidth(parseFloat(e.target.value))}
                className="slider"
              />
            </div>

            <div className="slider-row">
              <label className="slider-label">深度: {buildingDepth.toFixed(1)}m</label>
              <input
                type="range"
                min="2"
                max="10"
                step="0.5"
                value={buildingDepth}
                onChange={(e) => setBuildingDepth(parseFloat(e.target.value))}
                className="slider"
              />
            </div>

            <div className="slider-row">
              <label className="slider-label">旋转: {buildingRotation.toFixed(0)}°</label>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={buildingRotation}
                onChange={(e) => setBuildingRotation(parseFloat(e.target.value))}
                className="slider"
              />
            </div>

            {selectedBuildingId && (
              <button
                className="delete-btn"
                onClick={(e) => {
                  btnRipple(e);
                  deleteSelectedBuilding();
                }}
              >
                删除选中建筑
              </button>
            )}
          </div>

          <div className="panel-hint">
            提示：点击网格放置建筑，点击已放置的建筑可选中编辑
          </div>
        </div>
      ) : null}
    </>
  );
}
