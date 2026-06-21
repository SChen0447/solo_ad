import { useState, useCallback, useEffect, useMemo } from 'react';
import SceneView from './scene/SceneView';
import TimeLine from './ui/TimeLine';
import ControlPanel from './ui/ControlPanel';
import {
  BUILDINGS,
  getEventsForYear,
  getBuildingById,
} from './data/historicalBuildings';
import type {
  BuildingStyle,
  HighlightMode,
  TimelineEvent,
} from './data/historicalBuildings';

interface BuildingStateItem {
  id: BuildingStyle;
  visible: boolean;
  opacity: number;
  scale: number;
}

type BuildingStates = Record<BuildingStyle, BuildingStateItem>;

const INITIAL_STATES: BuildingStates = {
  greek: { id: 'greek', visible: true, opacity: 0.85, scale: 1.0 },
  gothic: { id: 'gothic', visible: true, opacity: 0.75, scale: 1.0 },
  baroque: { id: 'baroque', visible: true, opacity: 0.7, scale: 1.0 },
  modern: { id: 'modern', visible: true, opacity: 0.8, scale: 1.0 },
};

function EventCard({
  event,
  onClose,
}: {
  event: TimelineEvent;
  onClose: () => void;
}) {
  const building = getBuildingById(event.buildingStyle);
  const yearStr = event.year < 0 ? `公元前 ${-event.year} 年` : `公元 ${event.year} 年`;

  return (
    <div className="event-card glass-panel" style={{ borderLeft: `4px solid ${building?.primaryColor || '#fff'}` }}>
      <button className="event-close" onClick={onClose}>×</button>
      <div className="event-card-header">
        <div className="event-thumb">{event.icon}</div>
        <div className="event-info">
          <div className="event-year">{yearStr}</div>
          <div className="event-title">{event.title}</div>
        </div>
      </div>
      <div className="event-desc">{event.description}</div>
      {building && (
        <div style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: building.primaryColor,
          }} />
          所属风格：{building.name}
        </div>
      )}
    </div>
  );
}

function BuildingTabs({
  states,
  active,
  onToggle,
  onActiveChange,
  onOpacityChange,
  onScaleChange,
}: {
  states: BuildingStates;
  active: BuildingStyle | null;
  onToggle: (id: BuildingStyle) => void;
  onActiveChange: (id: BuildingStyle | null) => void;
  onOpacityChange: (id: BuildingStyle, v: number) => void;
  onScaleChange: (id: BuildingStyle, v: number) => void;
}) {
  return (
    <div className="building-tabs">
      {BUILDINGS.map((b) => {
        const s = states[b.id];
        const isActive = active === b.id;
        return (
          <div
            key={b.id}
            className={`building-tab ${isActive ? 'active' : ''} ${!s.visible ? 'dimmed' : ''}`}
            style={{
              background: `linear-gradient(135deg, ${b.primaryColor}, ${b.primaryColor}99)`,
              opacity: s.visible ? 1 : 0.45,
            }}
            onClick={(e) => {
              if (e.shiftKey || e.ctrlKey) {
                onToggle(b.id);
              } else {
                onActiveChange(isActive ? null : b.id);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onToggle(b.id);
            }}
            title={`${b.name} · ${b.period}\n(点击选中，右键或Shift+点击切换显示)`}
          >
            <span>{b.icon}</span>
            <span className="tab-label">{b.name}</span>

            {isActive && (
              <div className="tab-controls glass-panel">
                <div className="control-group">
                  <label className="control-label">
                    可见性：{s.visible ? '显示' : '隐藏'}
                  </label>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(b.id);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: s.visible
                        ? 'linear-gradient(135deg, #64b5f6, #ce93d8)'
                        : 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {s.visible ? '✓ 已显示，点击隐藏' : '○ 已隐藏，点击显示'}
                  </button>
                </div>

                <div className="control-group">
                  <label className="control-label">
                    透明度：{s.opacity.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={s.opacity}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onOpacityChange(b.id, parseFloat(e.target.value))
                    }
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">
                    缩放：{s.scale.toFixed(2)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={s.scale}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onScaleChange(b.id, parseFloat(e.target.value))
                    }
                  />
                </div>

                <div style={{
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  marginTop: '6px',
                  padding: '6px 8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '6px',
                  lineHeight: '1.5',
                }}>
                  💡 <b>{b.name}</b><br />
                  {b.description}<br />
                  特征：{b.features.slice(0, 3).join('、')}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [buildingStates, setBuildingStates] = useState<BuildingStates>(INITIAL_STATES);
  const [activeBuilding, setActiveBuilding] = useState<BuildingStyle | null>('greek');
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('none');
  const [compareMode, setCompareMode] = useState(false);
  const [comparePair, setComparePair] = useState<BuildingStyle[]>(['greek', 'gothic']);
  const [dividerPosition, setDividerPosition] = useState(0.5);
  const [currentEvent, setCurrentEvent] = useState<TimelineEvent | null>(null);
  const [targetRotation, setTargetRotation] = useState(0);

  const handleToggleBuilding = useCallback((id: BuildingStyle) => {
    setBuildingStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], visible: !prev[id].visible },
    }));
  }, []);

  const handleOpacityChange = useCallback((id: BuildingStyle, v: number) => {
    setBuildingStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], opacity: v },
    }));
  }, []);

  const handleScaleChange = useCallback((id: BuildingStyle, v: number) => {
    setBuildingStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], scale: v },
    }));
  }, []);

  const handleTimeClick = useCallback((year: number) => {
    const evt = getEventsForYear(year);
    if (evt) {
      setCurrentEvent(evt);
    } else {
      setCurrentEvent(null);
    }
  }, []);

  const handleEventSelect = useCallback((evt: TimelineEvent) => {
    setCurrentEvent(evt);
    setActiveBuilding(evt.buildingStyle);
  }, []);

  useEffect(() => {
    if (compareMode) {
      setTargetRotation(Math.PI / 6);
    } else {
      setTargetRotation(0);
    }
  }, [compareMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCurrentEvent(null);
        setActiveBuilding(null);
      }
      if (e.key === '1') setActiveBuilding('greek');
      if (e.key === '2') setActiveBuilding('gothic');
      if (e.key === '3') setActiveBuilding('baroque');
      if (e.key === '4') setActiveBuilding('modern');
      if (e.key.toLowerCase() === 'c') setCompareMode((p) => !p);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const validComparePair = useMemo(() => {
    if (comparePair[0] === comparePair[1]) {
      const other = BUILDINGS.find((b) => b.id !== comparePair[0]);
      return [comparePair[0], other?.id || 'greek'] as BuildingStyle[];
    }
    return comparePair;
  }, [comparePair]);

  return (
    <div className="app-container">
      <SceneView
        buildings={BUILDINGS}
        buildingStates={buildingStates}
        highlightMode={highlightMode}
        compareMode={compareMode}
        comparePair={validComparePair}
        dividerPosition={dividerPosition}
        targetRotation={targetRotation}
      />

      <div className="header-bar glass-panel">
        <span className="header-logo">🏛️</span>
        <span className="header-title">ARCHITECTURAL TIME EXPLORER</span>
      </div>

      <BuildingTabs
        states={buildingStates}
        active={activeBuilding}
        onToggle={handleToggleBuilding}
        onActiveChange={setActiveBuilding}
        onOpacityChange={handleOpacityChange}
        onScaleChange={handleScaleChange}
      />

      <ControlPanel
        highlightMode={highlightMode}
        onHighlightModeChange={setHighlightMode}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
        comparePair={validComparePair}
        onComparePairChange={setComparePair}
        dividerPosition={dividerPosition}
        onDividerPositionChange={setDividerPosition}
      />

      <TimeLine
        activeBuilding={activeBuilding}
        onTimeClick={handleTimeClick}
        onEventSelect={handleEventSelect}
      />

      {currentEvent && (
        <EventCard event={currentEvent} onClose={() => setCurrentEvent(null)} />
      )}

      <div style={{
        position: 'absolute',
        bottom: '130px',
        right: '30px',
        zIndex: 10,
        fontSize: '10px',
        color: 'rgba(255,255,255,0.45)',
        textAlign: 'right',
        lineHeight: '1.7',
        letterSpacing: '0.3px',
      }}>
        <div>🖱️ 拖拽旋转 · 滚轮缩放</div>
        <div>⌨️ 1-4 切换建筑 · C 对比模式 · Esc 取消</div>
        <div>💡 右键标签快速隐藏/显示</div>
      </div>
    </div>
  );
}
