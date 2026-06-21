import React, { useState, useCallback } from 'react';
import { FurniturePanel } from './FurniturePanel';
import { FurnitureType } from '../models/Furniture';
import { FloorMaterialType } from '../models/Room';

const WALL_COLORS = [
  { name: '白色', color: '#FFFFFF' },
  { name: '米色', color: '#F5F5DC' },
  { name: '浅蓝', color: '#ADD8E6' },
  { name: '浅绿', color: '#90EE90' },
  { name: '浅粉', color: '#FFB6C1' },
  { name: '浅黄', color: '#FFFACD' },
  { name: '灰色', color: '#E0E0E0' },
  { name: '深灰', color: '#A9A9A9' }
];

const FLOOR_MATERIALS: { value: FloorMaterialType; label: string }[] = [
  { value: 'wood', label: '木地板' },
  { value: 'tile', label: '瓷砖' },
  { value: 'carpet', label: '地毯' }
];

interface ControlPanelProps {
  currentWallColor: string;
  currentFloorType: FloorMaterialType;
  onWallColorChange: (color: string) => void;
  onFloorTypeChange: (type: FloorMaterialType) => void;
  onAddFurniture: (type: FurnitureType) => void;
  addedTypes: Set<FurnitureType>;
  spotIntensity: number;
  spotAngle: number;
  spotColor: string;
  spotX: number;
  spotY: number;
  spotZ: number;
  onSpotIntensityChange: (v: number) => void;
  onSpotAngleChange: (v: number) => void;
  onSpotColorChange: (v: string) => void;
  onSpotXChange: (v: number) => void;
  onSpotYChange: (v: number) => void;
  onSpotZChange: (v: number) => void;
  pointEnabled: boolean;
  pointIntensity: number;
  onPointToggle: () => void;
  onPointIntensityChange: (v: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const {
    currentWallColor,
    currentFloorType,
    onWallColorChange,
    onFloorTypeChange,
    onAddFurniture,
    addedTypes,
    spotIntensity,
    spotAngle,
    spotColor,
    spotX, spotY, spotZ,
    onSpotIntensityChange,
    onSpotAngleChange,
    onSpotColorChange,
    onSpotXChange,
    onSpotYChange,
    onSpotZChange,
    pointEnabled,
    pointIntensity,
    onPointToggle,
    onPointIntensityChange
  } = props;

  const [isCollapsed, setIsCollapsed] = useState(false);

  const togglePanel = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  return (
    <>
      <div className={`control-panel ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="panel-header">
          <h2 className="panel-title">房间风格设置</h2>
        </div>

        <div className="section">
          <div className="section-title">墙壁颜色</div>
          <div className="color-picker-grid">
            {WALL_COLORS.map(item => (
              <div
                key={item.color}
                className={`color-circle ${currentWallColor.toLowerCase() === item.color.toLowerCase() ? 'selected' : ''}`}
                style={{ backgroundColor: item.color }}
                onClick={() => onWallColorChange(item.color)}
                title={item.name}
              >
                <div className="color-inner" style={{ backgroundColor: item.color }} />
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-title">地板材质</div>
          <select
            className="select-input"
            value={currentFloorType}
            onChange={(e) => onFloorTypeChange(e.target.value as FloorMaterialType)}
          >
            {FLOOR_MATERIALS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="divider" />

        <div className="panel-header">
          <h2 className="panel-title">家具管理</h2>
        </div>

        <div className="section">
          <FurniturePanel
            onAddFurniture={onAddFurniture}
            addedTypes={addedTypes}
          />
        </div>

        <div className="divider" />

        <div className="panel-header">
          <h2 className="panel-title">光照控制</h2>
        </div>

        <div className="section">
          <div className="section-subtitle">聚光灯</div>

          <div className="slider-container">
            <div className="slider-label">
              <span>强度</span>
              <span className="slider-value">{spotIntensity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={spotIntensity}
              onChange={(e) => onSpotIntensityChange(parseFloat(e.target.value))}
              className="slider"
            />
          </div>

          <div className="slider-container">
            <div className="slider-label">
              <span>角度</span>
              <span className="slider-value">{spotAngle.toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min="15"
              max="90"
              step="1"
              value={spotAngle}
              onChange={(e) => onSpotAngleChange(parseFloat(e.target.value))}
              className="slider"
            />
          </div>

          <div className="color-picker-row">
            <span className="color-picker-label">颜色</span>
            <input
              type="color"
              value={spotColor}
              onChange={(e) => onSpotColorChange(e.target.value)}
              className="color-input"
            />
          </div>

          <div className="slider-container">
            <div className="slider-label">
              <span>位置 X</span>
              <span className="slider-value">{spotX.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.05"
              value={spotX}
              onChange={(e) => onSpotXChange(parseFloat(e.target.value))}
              className="slider"
            />
          </div>

          <div className="slider-container">
            <div className="slider-label">
              <span>位置 Y</span>
              <span className="slider-value">{spotY.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.05"
              value={spotY}
              onChange={(e) => onSpotYChange(parseFloat(e.target.value))}
              className="slider"
            />
          </div>

          <div className="slider-container">
            <div className="slider-label">
              <span>位置 Z</span>
              <span className="slider-value">{spotZ.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.05"
              value={spotZ}
              onChange={(e) => onSpotZChange(parseFloat(e.target.value))}
              className="slider"
            />
          </div>
        </div>

        <div className="section">
          <div className="section-subtitle">落地灯（点光源）</div>

          <div className="toggle-row">
            <span>开关</span>
            <button
              className={`toggle-switch ${pointEnabled ? 'active' : ''}`}
              onClick={onPointToggle}
            >
              <div className="toggle-thumb" />
            </button>
          </div>

          <div className="slider-container">
            <div className="slider-label">
              <span>强度</span>
              <span className="slider-value">{pointIntensity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={pointIntensity}
              onChange={(e) => onPointIntensityChange(parseFloat(e.target.value))}
              className="slider"
              disabled={!pointEnabled}
              style={{ opacity: pointEnabled ? 1 : 0.5 }}
            />
          </div>
        </div>
      </div>

      <button className="panel-toggle" onClick={togglePanel}>
        {isCollapsed ? '◀' : '▶'}
      </button>
    </>
  );
};
