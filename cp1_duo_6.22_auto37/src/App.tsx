import React, { useState, useEffect, useCallback } from 'react';
import { eventBus, EditorEvent } from './core/eventSystem';
import { MapData, MapEntity, EventBinding, CustomUnitType } from './core/mapData';
import { exportMapToJson } from './core/mapExport';
import EditorCanvas from './ui/EditorCanvas';
import ToolPanel from './ui/ToolPanel';

interface EventPreview {
  entityId: string;
  name: string;
  type: string;
}

const App: React.FC = () => {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
  const [activeEntityColor, setActiveEntityColor] = useState<string | undefined>();
  const [activeEntityName, setActiveEntityName] = useState<string | undefined>();
  const [activeTerrain, setActiveTerrain] = useState<'grass' | 'wall' | 'water' | null>(null);
  const [pathMode, setPathMode] = useState(false);
  const [pathEntityId, setPathEntityId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [eventPreview, setEventPreview] = useState<EventPreview | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const unsub = eventBus.on(EditorEvent.MAP_UPDATED, (data: unknown) => {
      setMapData(data as MapData);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const collapsed = windowWidth < 1024;

  const entities = mapData?.entities || [];
  const events = mapData?.events || [];
  const customUnitTypes = mapData?.customUnitTypes || [];

  const handleSelectEntityType = useCallback(
    (type: string | null, color?: string, name?: string) => {
      if (activeEntityType === type && activeEntityColor === color && activeEntityName === name) {
        setActiveEntityType(null);
        setActiveEntityColor(undefined);
        setActiveEntityName(undefined);
      } else {
        setActiveEntityType(type);
        setActiveEntityColor(color);
        setActiveEntityName(name);
        setActiveTerrain(null);
      }
    },
    [activeEntityType, activeEntityColor, activeEntityName]
  );

  const handleSelectTerrain = useCallback(
    (t: 'grass' | 'wall' | 'water' | null) => {
      setActiveTerrain(t);
      if (t) {
        setActiveEntityType(null);
        setActiveEntityColor(undefined);
        setActiveEntityName(undefined);
      }
    },
    []
  );

  const handleTogglePathMode = useCallback(
    (on: boolean) => {
      setPathMode(on);
      if (!on) {
        setPathEntityId(null);
      }
    },
    []
  );

  const handleExport = useCallback(() => {
    setExporting(true);
    setTimeout(() => {
      exportMapToJson();
      setExporting(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 1000);
  }, []);

  const handlePreviewEvent = useCallback(
    (entityId: string) => {
      const ev = events.find((e) => e.entityId === entityId);
      if (ev) {
        setEventPreview({ entityId, name: ev.name, type: ev.type });
      }
    },
    [events]
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        background: '#1a1a2e',
        overflow: 'hidden',
      }}
    >
      <ToolPanel
        activeEntityType={activeEntityType}
        activeEntityColor={activeEntityColor}
        activeEntityName={activeEntityName}
        activeTerrain={activeTerrain}
        pathMode={pathMode}
        pathEntityId={pathEntityId}
        selectedEntityId={selectedEntityId}
        customUnitTypes={customUnitTypes}
        entities={entities}
        events={events}
        onSelectEntityType={handleSelectEntityType}
        onSelectTerrain={handleSelectTerrain}
        onTogglePathMode={handleTogglePathMode}
        onSetPathEntity={setPathEntityId}
        onExport={handleExport}
        exporting={exporting}
        collapsed={collapsed}
      />

      <EditorCanvas
        activeEntityType={activeEntityType}
        activeEntityColor={activeEntityColor}
        activeEntityName={activeEntityName}
        activeTerrain={activeTerrain}
        pathMode={pathMode}
        pathEntityId={pathEntityId}
        customUnitTypes={customUnitTypes}
        onSelectEntity={setSelectedEntityId}
        selectedEntityId={selectedEntityId}
        onPreviewEvent={handlePreviewEvent}
      />

      {showSuccess && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: '#4caf50',
            color: '#fff',
            textAlign: 'center',
            padding: '10px 0',
            fontSize: 14,
            fontWeight: 600,
            zIndex: 2000,
            animation: 'slideDown 0.3s ease-out',
            boxShadow: '0 2px 12px rgba(76,175,80,0.4)',
          }}
        >
          地图数据已成功导出！
        </div>
      )}

      {eventPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.15s',
          }}
          onClick={() => setEventPreview(null)}
        >
          <div
            style={{
              background: '#2d2d44',
              borderRadius: 12,
              padding: 24,
              minWidth: 260,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'scaleIn 0.2s',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              事件预览
            </div>
            <div
              style={{
                color: '#ffd600',
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              ⚡ {eventPreview.name}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              类型：
              {eventPreview.type === 'dialog'
                ? '对话框'
                : eventPreview.type === 'battle'
                ? '战斗'
                : '传送门'}
            </div>
            <button
              onClick={() => setEventPreview(null)}
              style={{
                padding: '6px 20px',
                border: 'none',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
