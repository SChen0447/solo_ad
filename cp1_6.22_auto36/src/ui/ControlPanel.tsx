import { useState } from 'react';
import { BUILDINGS, HIGHLIGHT_MODES } from '../data/historicalBuildings';
import type { BuildingStyle, HighlightMode } from '../data/historicalBuildings';

interface ControlPanelProps {
  highlightMode: HighlightMode;
  onHighlightModeChange: (mode: HighlightMode) => void;
  compareMode: boolean;
  onCompareModeChange: (enabled: boolean) => void;
  comparePair: BuildingStyle[];
  onComparePairChange: (pair: BuildingStyle[]) => void;
  dividerPosition: number;
  onDividerPositionChange: (pos: number) => void;
}

const HIGHLIGHT_LABELS: Record<HighlightMode, string> = {
  none: '默认',
  structure: '结构',
  decoration: '装饰',
};

export default function ControlPanel({
  highlightMode,
  onHighlightModeChange,
  compareMode,
  onCompareModeChange,
  comparePair,
  onComparePairChange,
  dividerPosition,
  onDividerPositionChange,
}: ControlPanelProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleStyleSelect = (index: number, value: BuildingStyle) => {
    const newPair = [...comparePair];
    newPair[index] = value;
    if (newPair[0] === newPair[1] && index === 1) {
      const other = BUILDINGS.find((b) => b.id !== value);
      if (other) newPair[0] = other.id;
    }
    onComparePairChange(newPair.slice(0, 2));
  };

  return (
    <>
      <div className="control-panel glass-panel">
        <div className="panel-title">风格对比控制台</div>

        <div className="panel-section">
          <label className="panel-label">对比要素高亮</label>
          <div className="highlight-buttons">
            {HIGHLIGHT_MODES.map((mode) => (
              <button
                key={mode}
                className={`highlight-btn ${highlightMode === mode ? 'active' : ''}`}
                onClick={() => onHighlightModeChange(mode)}
              >
                {HIGHLIGHT_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <label className="panel-label">并列对比模式</label>
          <button
            className={`compare-toggle ${compareMode ? 'active' : ''}`}
            onClick={() => onCompareModeChange(!compareMode)}
          >
            {compareMode ? '✓ 对比模式已启用' : '启用并列对比'}
          </button>
        </div>

        {compareMode && (
          <>
            <div className="panel-section">
              <label className="panel-label">左侧建筑</label>
              <select
                className="style-select"
                value={comparePair[0] || ''}
                onChange={(e) => handleStyleSelect(0, e.target.value as BuildingStyle)}
              >
                {BUILDINGS.map((b) => (
                  <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                ))}
              </select>
            </div>
            <div className="panel-section">
              <label className="panel-label">右侧建筑</label>
              <select
                className="style-select"
                value={comparePair[1] || ''}
                onChange={(e) => handleStyleSelect(1, e.target.value as BuildingStyle)}
              >
                {BUILDINGS.map((b) => (
                  <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                ))}
              </select>
            </div>
            <div className="panel-section">
              <label className="panel-label">
                分割线位置 {Math.round(dividerPosition * 100)}%
              </label>
              <input
                type="range"
                min="25"
                max="75"
                step="1"
                value={dividerPosition * 100}
                onChange={(e) => onDividerPositionChange(parseInt(e.target.value) / 100)}
                style={{ marginTop: '4px' }}
              />
            </div>
          </>
        )}
      </div>

      {compareMode && (
        <div
          className="divider-line"
          style={{
            left: `calc(${dividerPosition * 100}% - 2px)`,
            cursor: isDragging ? 'ew-resize' : 'ew-resize',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
            const startX = e.clientX;
            const startPos = dividerPosition;
            const handleMove = (ev: MouseEvent) => {
              const dx = ev.clientX - startX;
              const delta = dx / window.innerWidth;
              const newPos = Math.max(0.25, Math.min(0.75, startPos + delta));
              onDividerPositionChange(newPos);
            };
            const handleUp = () => {
              setIsDragging(false);
              document.removeEventListener('mousemove', handleMove);
              document.removeEventListener('mouseup', handleUp);
            };
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
          }}
        >
          <div className="divider-handle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="8" y1="6" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="18" />
            </svg>
          </div>
        </div>
      )}
    </>
  );
}
