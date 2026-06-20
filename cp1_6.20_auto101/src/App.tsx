import React, { useState, useEffect, useCallback } from 'react';
import ComponentPanel from './components/ComponentPanel';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import SnapshotView from './components/SnapshotView';
import {
  CanvasComponent,
  ComponentType,
  LayoutSnapshot,
  getComponentMeta,
  generateId,
} from './utils/layoutEngine';

const MAX_SNAPSHOTS = 5;
const MOBILE_BREAKPOINT = 900;
const DEFAULT_CONTAINER_WIDTH = 600;

const App: React.FC = () => {
  const [components, setComponents] = useState<CanvasComponent[]>([]);
  const [containerWidth, setContainerWidth] = useState<number>(DEFAULT_CONTAINER_WIDTH);
  const [snapshots, setSnapshots] = useState<LayoutSnapshot[]>([]);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAddComponent = useCallback((type: ComponentType) => {
    const meta = getComponentMeta(type);
    const newComponent: CanvasComponent = {
      id: generateId(),
      type,
      minWidth: meta.minWidth,
      defaultHeight: meta.defaultHeight,
    };
    setComponents((prev) => [...prev, newComponent]);
  }, []);

  const handleRemoveComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleContainerResize = useCallback((width: number) => {
    setContainerWidth(width);
  }, []);

  const handleSaveSnapshot = useCallback(() => {
    setSnapshots((prev) => {
      if (prev.length >= MAX_SNAPSHOTS) return prev;
      const newSnapshot: LayoutSnapshot = {
        id: generateId(),
        containerWidth,
        components: components.map((c) => ({ ...c })),
        timestamp: Date.now(),
      };
      return [...prev, newSnapshot];
    });
  }, [containerWidth, components]);

  const handleDeleteSnapshot = useCallback((id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const mainAreaStyle: React.CSSProperties = isMobile
    ? { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }
    : { display: 'flex', flex: 1, overflow: 'hidden' };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 48,
          background: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            color: '#ffffff',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          响应式布局调试沙盒
        </h1>
      </div>

      <div style={mainAreaStyle}>
        {isMobile ? (
          <>
            <ComponentPanel
              onAddComponent={handleAddComponent}
              collapsed={leftCollapsed}
              onToggle={() => setLeftCollapsed((c) => !c)}
              isMobile={isMobile}
            />
            <Canvas
              components={components}
              containerWidth={containerWidth}
              onContainerResize={handleContainerResize}
              onRemoveComponent={handleRemoveComponent}
              onAddComponent={handleAddComponent}
            />
            <PropertyPanel
              snapshots={snapshots}
              maxSnapshots={MAX_SNAPSHOTS}
              onSaveSnapshot={handleSaveSnapshot}
              onDeleteSnapshot={handleDeleteSnapshot}
              collapsed={rightCollapsed}
              onToggle={() => setRightCollapsed((c) => !c)}
              isMobile={isMobile}
            />
          </>
        ) : (
          <>
            <ComponentPanel
              onAddComponent={handleAddComponent}
              collapsed={leftCollapsed}
              onToggle={() => setLeftCollapsed((c) => !c)}
              isMobile={isMobile}
            />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <Canvas
                components={components}
                containerWidth={containerWidth}
                onContainerResize={handleContainerResize}
                onRemoveComponent={handleRemoveComponent}
                onAddComponent={handleAddComponent}
              />
              <SnapshotView snapshots={snapshots} />
            </div>
            <PropertyPanel
              snapshots={snapshots}
              maxSnapshots={MAX_SNAPSHOTS}
              onSaveSnapshot={handleSaveSnapshot}
              onDeleteSnapshot={handleDeleteSnapshot}
              collapsed={rightCollapsed}
              onToggle={() => setRightCollapsed((c) => !c)}
              isMobile={isMobile}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default App;
