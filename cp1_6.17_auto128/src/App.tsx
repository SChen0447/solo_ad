import { useState, useRef, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ComponentPanel from './components/ComponentPanel';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import { HistoryManager } from './utils/history';
import { exportCanvasAsPNG } from './utils/export';
import { generateId } from './utils/export';
import {
  LayoutComponent,
  ComponentType,
  ComponentTemplate,
  Breakpoint,
  HistoryState,
} from './types';

const componentTemplates: ComponentTemplate[] = [
  {
    type: ComponentType.NAVBAR,
    name: '导航栏',
    icon: '🧭',
    defaultWidth: 1200,
    defaultHeight: 80,
    defaultColor: '#bee3f8',
  },
  {
    type: ComponentType.CAROUSEL,
    name: '轮播图',
    icon: '🖼️',
    defaultWidth: 1200,
    defaultHeight: 400,
    defaultColor: '#e9d8fd',
  },
  {
    type: ComponentType.CARD_GRID,
    name: '卡片网格',
    icon: '📋',
    defaultWidth: 1200,
    defaultHeight: 300,
    defaultColor: '#c6f6d5',
  },
  {
    type: ComponentType.TWO_COLUMN,
    name: '两栏布局',
    icon: '⊞',
    defaultWidth: 1200,
    defaultHeight: 350,
    defaultColor: '#feebc8',
  },
  {
    type: ComponentType.THREE_COLUMN,
    name: '三栏布局',
    icon: '⬚',
    defaultWidth: 1200,
    defaultHeight: 300,
    defaultColor: '#feebc8',
  },
  {
    type: ComponentType.FOOTER,
    name: '页脚',
    icon: '📄',
    defaultWidth: 1200,
    defaultHeight: 120,
    defaultColor: '#edf2f7',
  },
];

function App() {
  const [components, setComponents] = useState<LayoutComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(Breakpoint.DESKTOP);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [panelVisible, setPanelVisible] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const historyManager = useRef(
    new HistoryManager({ components: [] })
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const maxZIndex = useRef(0);

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyManager.current.canUndo());
    setCanRedo(historyManager.current.canRedo());
  }, []);

  const pushHistory = useCallback((newComponents: LayoutComponent[]) => {
    historyManager.current.push({ components: newComponents });
    updateHistoryState();
  }, [updateHistoryState]);

  const handleUndo = useCallback(() => {
    const state = historyManager.current.undo();
    if (state) {
      setComponents(state.components);
      setSelectedId(null);
      updateHistoryState();
    }
  }, [updateHistoryState]);

  const handleRedo = useCallback(() => {
    const state = historyManager.current.redo();
    if (state) {
      setComponents(state.components);
      setSelectedId(null);
      updateHistoryState();
    }
  }, [updateHistoryState]);

  const handleDrop = useCallback(
    (type: ComponentType, x: number, y: number) => {
      const template = componentTemplates.find((t) => t.type === type);
      if (!template) return;

      maxZIndex.current += 1;
      const scale = breakpoint / 1200;
      const newComponent: LayoutComponent = {
        id: generateId(),
        type: template.type,
        name: template.name,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.min(template.defaultWidth * scale, breakpoint),
        height: template.defaultHeight,
        zIndex: maxZIndex.current,
        locked: false,
        style: {
          backgroundColor: template.defaultColor,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          borderRadius: 0,
        },
      };

      const newComponents = [...components, newComponent];
      setComponents(newComponents);
      pushHistory(newComponents);
      setSelectedId(newComponent.id);
    },
    [components, breakpoint, pushHistory]
  );

  const handleComponentMove = useCallback(
    (id: string, x: number, y: number) => {
      const newComponents = components.map((c) =>
        c.id === id ? { ...c, x, y } : c
      );
      setComponents(newComponents);
    },
    [components]
  );

  const handleComponentMoveEnd = useCallback(() => {
    pushHistory(components);
  }, [components, pushHistory]);

  const handleComponentResize = useCallback(
    (id: string, width: number, height: number) => {
      const newComponents = components.map((c) =>
        c.id === id ? { ...c, width, height } : c
      );
      setComponents(newComponents);
    },
    [components]
  );

  const handleComponentResizeEnd = useCallback(() => {
    pushHistory(components);
  }, [components, pushHistory]);

  const handleComponentSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const handleComponentDelete = useCallback(
    (id: string) => {
      const newComponents = components.filter((c) => c.id !== id);
      setComponents(newComponents);
      pushHistory(newComponents);
      if (selectedId === id) {
        setSelectedId(null);
      }
    },
    [components, selectedId, pushHistory]
  );

  const handleComponentDuplicate = useCallback(
    (id: string) => {
      const component = components.find((c) => c.id === id);
      if (!component) return;

      maxZIndex.current += 1;
      const newComponent: LayoutComponent = {
        ...component,
        id: generateId(),
        x: component.x + 20,
        y: component.y + 20,
        zIndex: maxZIndex.current,
        locked: false,
      };

      const newComponents = [...components, newComponent];
      setComponents(newComponents);
      pushHistory(newComponents);
      setSelectedId(newComponent.id);
    },
    [components, pushHistory]
  );

  const handleComponentBringToFront = useCallback(
    (id: string) => {
      maxZIndex.current += 1;
      const newComponents = components.map((c) =>
        c.id === id ? { ...c, zIndex: maxZIndex.current } : c
      );
      setComponents(newComponents);
      pushHistory(newComponents);
    },
    [components, pushHistory]
  );

  const handleComponentSendToBack = useCallback(
    (id: string) => {
      const newComponents = components.map((c) =>
        c.id === id ? { ...c, zIndex: -1 } : c
      );
      setComponents(newComponents);
      pushHistory(newComponents);
    },
    [components, pushHistory]
  );

  const handleComponentLock = useCallback(
    (id: string) => {
      const newComponents = components.map((c) =>
        c.id === id ? { ...c, locked: !c.locked } : c
      );
      setComponents(newComponents);
      pushHistory(newComponents);
    },
    [components, pushHistory]
  );

  const handleStyleChange = useCallback(
    (id: string, style: Partial<LayoutComponent['style']>) => {
      const newComponents = components.map((c) =>
        c.id === id ? { ...c, style: { ...c.style, ...style } } : c
      );
      setComponents(newComponents);
    },
    [components]
  );

  const handleStyleChangeEnd = useCallback(() => {
    pushHistory(components);
  }, [components, pushHistory]);

  const handleClearCanvas = useCallback(() => {
    setComponents([]);
    pushHistory([]);
    setSelectedId(null);
    maxZIndex.current = 0;
    historyManager.current.clear();
    updateHistoryState();
  }, [pushHistory, updateHistoryState]);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current || isExporting) return;

    setIsExporting(true);
    try {
      await exportCanvasAsPNG(canvasRef.current, 1920, 1080);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
      }, 1000);
    }
  }, [isExporting]);

  const handleBreakpointChange = useCallback((newBreakpoint: Breakpoint) => {
    setBreakpoint(newBreakpoint);
  }, []);

  const selectedComponent = components.find((c) => c.id === selectedId);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= Breakpoint.MOBILE) {
        setPanelVisible(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {breakpoint === Breakpoint.MOBILE && (
            <button
              onClick={() => setPanelVisible(!panelVisible)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: '#ffffff',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ☰
            </button>
          )}

          <button
            onClick={handleUndo}
            disabled={!canUndo}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: canUndo ? '#ffffff' : '#f7fafc',
              color: canUndo ? '#2d3748' : '#a0aec0',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
            title="撤销 (Ctrl+Z)"
          >
            ↩ 撤销
          </button>

          <button
            onClick={handleRedo}
            disabled={!canRedo}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: canRedo ? '#ffffff' : '#f7fafc',
              color: canRedo ? '#2d3748' : '#a0aec0',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
            title="重做 (Ctrl+Y)"
          >
            ↪ 重做
          </button>

          <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />

          <button
            onClick={() => setShowConfirmDialog(true)}
            style={{
              padding: '8px 16px',
              border: '1px solid #fc8181',
              borderRadius: '6px',
              background: '#ffffff',
              color: '#c53030',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            🗑 清空画布
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '6px',
              background: isExporting ? '#a0aec0' : '#4299e1',
              color: '#ffffff',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              marginLeft: 'auto',
            }}
          >
            {isExporting ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                导出中...
              </span>
            ) : (
              '📷 截图导出'
            )}
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {(panelVisible || breakpoint !== Breakpoint.MOBILE) && (
            <ComponentPanel templates={componentTemplates} />
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              {[Breakpoint.DESKTOP, Breakpoint.TABLET, Breakpoint.MOBILE].map((bp) => (
                <button
                  key={bp}
                  onClick={() => handleBreakpointChange(bp)}
                  style={{
                    padding: '6px 16px',
                    border: breakpoint === bp ? '2px solid #4299e1' : '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: breakpoint === bp ? '#ebf8ff' : '#ffffff',
                    color: breakpoint === bp ? '#2b6cb0' : '#4a5568',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: breakpoint === bp ? 600 : 400,
                    transition: 'all 0.2s',
                  }}
                >
                  {bp === Breakpoint.DESKTOP && '🖥️ 桌面 1200px'}
                  {bp === Breakpoint.TABLET && '📱 平板 768px'}
                  {bp === Breakpoint.MOBILE && '📲 手机 375px'}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
              <Canvas
                ref={canvasRef}
                components={components}
                selectedId={selectedId}
                breakpoint={breakpoint}
                onDrop={handleDrop}
                onComponentMove={handleComponentMove}
                onComponentMoveEnd={handleComponentMoveEnd}
                onComponentResize={handleComponentResize}
                onComponentResizeEnd={handleComponentResizeEnd}
                onComponentSelect={handleComponentSelect}
                onComponentDelete={handleComponentDelete}
                onComponentDuplicate={handleComponentDuplicate}
                onComponentBringToFront={handleComponentBringToFront}
                onComponentSendToBack={handleComponentSendToBack}
                onComponentLock={handleComponentLock}
              />
            </div>
          </div>

          {breakpoint !== Breakpoint.MOBILE && (
            <PropertyPanel
              component={selectedComponent}
              onStyleChange={handleStyleChange}
              onStyleChangeEnd={handleStyleChangeEnd}
            />
          )}
        </div>

        {showConfirmDialog && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(26, 32, 44, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={() => setShowConfirmDialog(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '24px 32px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                animation: 'slideIn 0.3s ease-out',
                minWidth: '320px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#2d3748' }}>
                确定清空所有布局？
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#718096' }}>
                此操作将删除画布上的所有组件，且无法恢复。
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  style={{
                    padding: '10px 24px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: '#f7fafc',
                    color: '#4a5568',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    handleClearCanvas();
                    setShowConfirmDialog(false);
                  }}
                  style={{
                    padding: '10px 24px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#4299e1',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}

        {isExporting && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #e2e8f0',
                  borderTop: '4px solid #4299e1',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span style={{ fontSize: '14px', color: '#4a5568' }}>正在生成截图...</span>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </DndProvider>
  );
}

export default App;
