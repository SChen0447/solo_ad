import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toPng } from 'html-to-image';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { Toast } from './components/Toast';
import { useMindMap } from './hooks/useMindMap';
import { generateMarkdownOutline, downloadMarkdown, downloadPNG } from './utils/exportUtils';

const App: React.FC = () => {
  const mindMap = useMindMap();
  const {
    state,
    addRootNode,
    addChildNode,
    updateNodePosition,
    updateNodeText,
    deleteNode,
    toggleCollapse,
    selectNode,
    setScale,
    setOffset,
    undo,
    redo,
    saveSnapshot,
    canUndo,
    canRedo,
  } = mindMap;

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' });
  const [newNodeId, setNewNodeId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2000);
  }, []);

  const handleAddRootNode = useCallback(() => {
    const container = canvasContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const centerX = (rect.width / 2 - state.offsetX) / state.scale;
      const centerY = (rect.height / 2 - state.offsetY) / state.scale;
      addRootNode(centerX, centerY);
    } else {
      addRootNode(0, 0);
    }
  }, [addRootNode, state.offsetX, state.offsetY, state.scale]);

  const handleAddChildNode = useCallback(() => {
    if (state.selectedNodeId) {
      addChildNode(state.selectedNodeId);
    }
  }, [state.selectedNodeId, addChildNode]);

  const handleExportPNG = useCallback(async () => {
    const canvas = canvasContainerRef.current;
    if (!canvas) {
      showToast('导出失败：找不到画布', 'error');
      return;
    }

    try {
      const dataUrl = await toPng(canvas, {
        backgroundColor: 'transparent',
        pixelRatio: 2,
        cacheBust: true,
      });
      downloadPNG(dataUrl, `灵感瀑布_${Date.now()}.png`);
      showToast('PNG导出成功！', 'success');
    } catch (error) {
      console.error('Export PNG error:', error);
      showToast('导出失败，请重试', 'error');
    }
  }, [showToast]);

  const handleExportMarkdown = useCallback(() => {
    try {
      const markdown = generateMarkdownOutline(state.nodes, state.rootIds);
      if (!markdown.trim()) {
        showToast('没有内容可导出', 'error');
        return;
      }
      downloadMarkdown(markdown, `灵感瀑布_${Date.now()}.md`);
      showToast('Markdown导出成功！', 'success');
    } catch (error) {
      console.error('Export Markdown error:', error);
      showToast('导出失败，请重试', 'error');
    }
  }, [state.nodes, state.rootIds, showToast]);

  const handleCommitNodePosition = useCallback(
    (id: string, x: number, y: number) => {
      // Position is already updated live, just ensure it's committed
      // The snapshot was saved at drag start
    },
    []
  );

  const handleNodeDragStart = useCallback(
    (id: string) => {
      saveSnapshot();
    },
    [saveSnapshot]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleCanvasClick = useCallback(
    (x: number, y: number) => {
      addRootNode(x, y);
    },
    [addRootNode]
  );

  const toolbarHeight = isMobile ? 48 : 60;

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1e1e2e',
        }}
      >
        <Toolbar
          onAddRootNode={handleAddRootNode}
          onAddChildNode={handleAddChildNode}
          onExportPNG={handleExportPNG}
          onExportMarkdown={handleExportMarkdown}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          hasSelection={!!state.selectedNodeId}
        />

        <div
          style={{
            flex: 1,
            position: 'relative',
            marginTop: toolbarHeight,
            overflow: 'hidden',
          }}
        >
          <div
            ref={canvasContainerRef}
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            <Canvas
              nodes={state.nodes}
              rootIds={state.rootIds}
              selectedNodeId={state.selectedNodeId}
              scale={state.scale}
              offsetX={state.offsetX}
              offsetY={state.offsetY}
              onSelectNode={selectNode}
              onAddRootNode={handleCanvasClick}
              onAddChildNode={addChildNode}
              onUpdateNodePosition={updateNodePosition}
              onUpdateNodeText={updateNodeText}
              onDeleteNode={deleteNode}
              onToggleCollapse={toggleCollapse}
              onSetScale={setScale}
              onSetOffset={setOffset}
              newNodeId={newNodeId}
              onCommitNodePosition={handleCommitNodePosition}
              canvasRef={canvasContainerRef as React.RefObject<HTMLDivElement>}
            />
          </div>
        </div>

        <Toast message={toast.message} visible={toast.visible} type={toast.type} />

        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            backgroundColor: 'rgba(30, 30, 46, 0.8)',
            padding: '8px 12px',
            borderRadius: '6px',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
          }}
        >
          缩放: {Math.round(state.scale * 100)}%
        </div>
      </div>
    </DndProvider>
  );
};

export default App;
