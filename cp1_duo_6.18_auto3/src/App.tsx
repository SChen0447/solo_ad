import { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasRenderer, ToolType } from './CanvasRenderer';
import { UndoManager } from './UndoManager';
import ToolPanel from './ToolPanel';
import ColorPalette from './ColorPalette';

const BREAKPOINT = 768;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const undoManagerRef = useRef<UndoManager>(new UndoManager(50));
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentTool, setCurrentTool] = useState<ToolType>('brush');
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [toast, setToast] = useState<{ message: string; phase: 'in' | 'show' | 'out' } | null>(null);
  const [undoFade, setUndoFade] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const um = undoManagerRef.current;
    const unsub = um.onChange(() => {
      setCanUndo(um.canUndo);
      setCanRedo(um.canRedo);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new CanvasRenderer(canvasRef.current, undoManagerRef.current);
    rendererRef.current = renderer;
    return () => {
      renderer.unbindEvents();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const dpr = 1;
    rendererRef.current.initCanvas(
      Math.floor(rect.width * dpr),
      Math.floor(rect.height * dpr)
    );
  }, [isMobile]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.currentColor = currentColor;
    }
  }, [currentColor]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.currentTool = currentTool;
    }
  }, [currentTool]);

  const showToast = useCallback((message: string) => {
    setToast({ message, phase: 'in' });
    setTimeout(() => setToast({ message, phase: 'show' }), 300);
    setTimeout(() => setToast({ message, phase: 'out' }), 2300);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const handleUndo = useCallback(() => {
    if (!rendererRef.current || !undoManagerRef.current.canUndo) return;
    setUndoFade(true);
    setTimeout(() => {
      const imgData = rendererRef.current!.undo();
      if (imgData) {
        rendererRef.current!.restoreFromImageData(imgData);
      }
      setUndoFade(false);
    }, 200);
  }, []);

  const handleRedo = useCallback(() => {
    if (!rendererRef.current || !undoManagerRef.current.canRedo) return;
    setUndoFade(true);
    setTimeout(() => {
      const imgData = rendererRef.current!.redo();
      if (imgData) {
        rendererRef.current!.restoreFromImageData(imgData);
      }
      setUndoFade(false);
    }, 200);
  }, []);

  const handleSave = useCallback(() => {
    if (!rendererRef.current) return;
    const dataURL = rendererRef.current.toDataURL();
    const link = document.createElement('a');
    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    link.download = `graffiti_${ts}.png`;
    link.href = dataURL;
    link.click();
    showToast('作品已保存！');
  }, [showToast]);

  const handleColorChange = useCallback((color: string) => {
    setCurrentColor(color);
  }, []);

  const toastOpacity = toast
    ? toast.phase === 'in'
      ? 0
      : toast.phase === 'show'
        ? 1
        : 0
    : 0;

  const toastTransition = toast
    ? toast.phase === 'in'
      ? 'opacity 0.3s ease-in'
      : toast.phase === 'out'
        ? 'opacity 0.5s ease-out'
        : 'none'
    : 'none';

  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#1a1a1a',
        overflow: 'hidden',
      }}>
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          background: '#2a2a2a',
          borderBottom: '1px solid #333',
          gap: 8,
        }}>
          <span style={{ color: '#4a90d9', fontWeight: 700, fontSize: 16 }}>涂鸦墙</span>
        </div>

        <div style={{
          height: 48,
          flexShrink: 0,
        }}>
          <ToolPanel
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onSave={handleSave}
            isMobile={true}
          />
        </div>

        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              cursor: currentTool === 'eraser' ? 'cell' : 'crosshair',
              opacity: undoFade ? 0.5 : 1,
              transition: undoFade ? 'opacity 0.2s ease-out' : 'opacity 0.1s ease-in',
              touchAction: 'none',
            }}
          />
        </div>

        <div style={{
          height: 100,
          flexShrink: 0,
        }}>
          <ColorPalette
            currentColor={currentColor}
            onColorChange={handleColorChange}
            isMobile={true}
          />
        </div>

        {toast && (
          <div style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(74, 144, 217, 0.9)',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            opacity: toastOpacity,
            transition: toastTransition,
            zIndex: 1000,
            pointerEvents: 'none',
          }}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      background: '#1a1a1a',
      overflow: 'hidden',
    }}>
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: '#2a2a2a',
        borderBottom: '1px solid #333',
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{
          color: '#4a90d9',
          fontWeight: 700,
          fontSize: 18,
          marginRight: 8,
          userSelect: 'none',
        }}>
          🎨 街头艺术涂鸦墙
        </span>
        <div style={{ width: 1, height: 28, background: '#444' }}/>
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          style={{
            height: 32,
            padding: '0 14px',
            background: canUndo
              ? 'linear-gradient(180deg, #4a90d9, #357abd)'
              : 'transparent',
            color: canUndo ? '#fff' : '#666',
            border: canUndo ? 'none' : '1px solid #444',
            borderRadius: 6,
            fontSize: 13,
            cursor: canUndo ? 'pointer' : 'default',
            opacity: canUndo ? 1 : 0.4,
            pointerEvents: canUndo ? 'auto' : 'none' as const,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          ↶ 撤销
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          style={{
            height: 32,
            padding: '0 14px',
            background: canRedo
              ? 'linear-gradient(180deg, #4a90d9, #357abd)'
              : 'transparent',
            color: canRedo ? '#fff' : '#666',
            border: canRedo ? 'none' : '1px solid #444',
            borderRadius: 6,
            fontSize: 13,
            cursor: canRedo ? 'pointer' : 'default',
            opacity: canRedo ? 1 : 0.4,
            pointerEvents: canRedo ? 'auto' : 'none' as const,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          ↷ 重做
        </button>
        <div style={{ flex: 1 }}/>
        <button
          onClick={handleSave}
          style={{
            height: 32,
            padding: '0 18px',
            background: 'linear-gradient(180deg, #4a90d9, #357abd)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
        >
          💾 保存作品
        </button>
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        <div style={{
          width: 56,
          flexShrink: 0,
        }}>
          <ToolPanel
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onSave={handleSave}
            isMobile={false}
          />
        </div>

        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            background: '#1a1a1a',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              cursor: currentTool === 'eraser' ? 'cell' : 'crosshair',
              opacity: undoFade ? 0.5 : 1,
              transition: undoFade ? 'opacity 0.2s ease-out' : 'opacity 0.1s ease-in',
              touchAction: 'none',
            }}
          />
        </div>

        <div style={{
          width: 200,
          flexShrink: 0,
        }}>
          <ColorPalette
            currentColor={currentColor}
            onColorChange={handleColorChange}
            isMobile={false}
          />
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(74, 144, 217, 0.9)',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          opacity: toastOpacity,
          transition: toastTransition,
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
