import React, { useCallback } from 'react';
import { Sun, Wind, Layers, Scissors, Plus, Trash2 } from 'lucide-react';
import type { SeasonType, Building, WindRose, SectionPlane } from '@/types';
import { formatTime, getSeasonName } from '@/utils/sunCalc';

interface UIPanelProps {
  season: SeasonType;
  time: number;
  onSeasonChange: (season: SeasonType) => void;
  onTimeChange: (time: number) => void;
  showWindParticles: boolean;
  onToggleWind: () => void;
  currentScheme: 'A' | 'B';
  onSchemeChange: (scheme: 'A' | 'B') => void;
  sectionPlane: SectionPlane;
  onSectionToggle: () => void;
  onSectionAxisChange: (axis: 'x' | 'z') => void;
  onSectionPositionChange: (position: number) => void;
  selectedBuilding: Building | null;
  onBuildingUpdate: (updates: Partial<Building>) => void;
  onAddBuilding: () => void;
  onDeleteBuilding: () => void;
  windRose: WindRose;
  onWindDirectionChange: (direction: number) => void;
  onWindSpeedChange: (speed: number) => void;
}

export const UIPanel: React.FC<UIPanelProps> = ({
  season,
  time,
  onSeasonChange,
  onTimeChange,
  showWindParticles,
  onToggleWind,
  currentScheme,
  onSchemeChange,
  sectionPlane,
  onSectionToggle,
  onSectionAxisChange,
  onSectionPositionChange,
  selectedBuilding,
  onBuildingUpdate,
  onAddBuilding,
  onDeleteBuilding,
  windRose,
  onWindDirectionChange,
  onWindSpeedChange,
}) => {
  const seasons: SeasonType[] = ['spring', 'summer', 'autumn', 'winter'];

  const handleSeasonClick = useCallback(
    (s: SeasonType) => {
      onSeasonChange(s);
    },
    [onSeasonChange]
  );

  const timeProgress = (time - 6) / 12;

  return (
    <div className="ui-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <Sun size={18} className="panel-icon" />
          日照与风环境分析
        </h2>
      </div>

      <div className="panel-section">
        <div className="scheme-tabs">
          <button
            className={`scheme-tab ${currentScheme === 'A' ? 'active' : ''}`}
            onClick={() => onSchemeChange('A')}
          >
            <Layers size={14} />
            方案 A
          </button>
          <button
            className={`scheme-tab ${currentScheme === 'B' ? 'active' : ''}`}
            onClick={() => onSchemeChange('B')}
          >
            <Layers size={14} />
            方案 B
          </button>
        </div>
      </div>

      <div className="panel-section">
        <label className="panel-label">
          <Sun size={14} className="label-icon" />
          日照设置
        </label>

        <div className="season-selector">
          {seasons.map((s) => (
            <button
              key={s}
              className={`season-btn ${season === s ? 'active' : ''}`}
              onClick={() => handleSeasonClick(s)}
            >
              {getSeasonName(s)}
            </button>
          ))}
        </div>

        <div className="time-slider-container">
          <div className="time-display">{formatTime(time)}</div>
          <div className="time-slider-track">
            <div
              className="time-slider-fill"
              style={{ width: `${timeProgress * 100}%` }}
            />
            <input
              type="range"
              min="6"
              max="18"
              step="0.25"
              value={time}
              onChange={(e) => onTimeChange(parseFloat(e.target.value))}
              className="time-slider"
            />
          </div>
          <div className="time-labels">
            <span>6:00</span>
            <span>12:00</span>
            <span>18:00</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <label className="panel-label">
          <Wind size={14} className="label-icon" />
          风场设置
        </label>

        <div className="wind-controls">
          <button
            className={`toggle-btn ${showWindParticles ? 'active' : ''}`}
            onClick={onToggleWind}
          >
            <Wind size={14} />
            {showWindParticles ? '风场开启' : '风场关闭'}
          </button>

          <div className="wind-input-group">
            <span className="input-label">风向</span>
            <input
              type="number"
              value={windRose.direction}
              onChange={(e) => onWindDirectionChange(parseFloat(e.target.value) || 0)}
              min="0"
              max="360"
              className="wind-input"
            />
            <span className="input-unit">°</span>
          </div>

          <div className="wind-input-group">
            <span className="input-label">风速</span>
            <input
              type="number"
              value={windRose.speed}
              onChange={(e) => onWindSpeedChange(parseFloat(e.target.value) || 1)}
              min="0.5"
              max="20"
              step="0.5"
              className="wind-input"
            />
            <span className="input-unit">m/s</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <label className="panel-label">
          <Scissors size={14} className="label-icon" />
          剖面切割
        </label>

        <div className="section-controls">
          <button
            className={`toggle-btn ${sectionPlane.active ? 'active' : ''}`}
            onClick={onSectionToggle}
          >
            <Scissors size={14} />
            {sectionPlane.active ? '已激活' : '未激活'}
          </button>

          {sectionPlane.active && (
            <>
              <div className="axis-toggle">
                <button
                  className={`axis-btn ${sectionPlane.axis === 'x' ? 'active' : ''}`}
                  onClick={() => onSectionAxisChange('x')}
                >
                  X 轴
                </button>
                <button
                  className={`axis-btn ${sectionPlane.axis === 'z' ? 'active' : ''}`}
                  onClick={() => onSectionAxisChange('z')}
                >
                  Z 轴
                </button>
              </div>

              <div className="section-slider-container">
                <input
                  type="range"
                  min="-40"
                  max="40"
                  step="1"
                  value={sectionPlane.position}
                  onChange={(e) => onSectionPositionChange(parseFloat(e.target.value))}
                  className="section-slider"
                />
                <span className="section-value">{sectionPlane.position.toFixed(0)}m</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel-section">
        <label className="panel-label">
          <Plus size={14} className="label-icon" />
          建筑编辑
        </label>

        <div className="building-controls">
          <button className="action-btn add-btn" onClick={onAddBuilding}>
            <Plus size={14} />
            添加建筑
          </button>
          <button
            className="action-btn delete-btn"
            onClick={onDeleteBuilding}
            disabled={!selectedBuilding}
          >
            <Trash2 size={14} />
            删除选中
          </button>
        </div>

        {selectedBuilding && (
          <div className="building-editor">
            <div className="editor-title">{selectedBuilding.name}</div>

            <div className="editor-row">
              <label>位置 X</label>
              <input
                type="number"
                value={selectedBuilding.x}
                onChange={(e) => onBuildingUpdate({ x: parseFloat(e.target.value) || 0 })}
                className="editor-input"
              />
            </div>

            <div className="editor-row">
              <label>位置 Z</label>
              <input
                type="number"
                value={selectedBuilding.z}
                onChange={(e) => onBuildingUpdate({ z: parseFloat(e.target.value) || 0 })}
                className="editor-input"
              />
            </div>

            <div className="editor-row">
              <label>宽度</label>
              <input
                type="number"
                value={selectedBuilding.width}
                onChange={(e) => onBuildingUpdate({ width: parseFloat(e.target.value) || 1 })}
                className="editor-input"
                min="1"
              />
            </div>

            <div className="editor-row">
              <label>深度</label>
              <input
                type="number"
                value={selectedBuilding.depth}
                onChange={(e) => onBuildingUpdate({ depth: parseFloat(e.target.value) || 1 })}
                className="editor-input"
                min="1"
              />
            </div>

            <div className="editor-row">
              <label>高度</label>
              <input
                type="number"
                value={selectedBuilding.height}
                onChange={(e) => onBuildingUpdate({ height: parseFloat(e.target.value) || 1 })}
                className="editor-input"
                min="1"
              />
            </div>

            <div className="editor-row">
              <label>颜色</label>
              <input
                type="color"
                value={selectedBuilding.color}
                onChange={(e) => onBuildingUpdate({ color: e.target.value })}
                className="editor-color"
              />
            </div>

            <div className="editor-row">
              <label>透明度</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={selectedBuilding.opacity}
                onChange={(e) => onBuildingUpdate({ opacity: parseFloat(e.target.value) })}
                className="editor-slider"
              />
              <span className="editor-value">{selectedBuilding.opacity.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UIPanel;
