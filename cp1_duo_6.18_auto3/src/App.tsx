import { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasRenderer, ToolType } from './CanvasRenderer';
import { UndoManager } from './UndoManager';
import ToolPanel from './ToolPanel';
import ColorPalette from './ColorPalette';
import './toast.css';

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
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [fadeState, setFadeState] = useState<'idle' | 'fading-out' | 'fading-in'>('idle');

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const unsubStroke = renderer.onStrokeEnd(() => {
      setCanUndo(undoManagerRef.current.canUndo);
      setCanRedo(undoManagerRef.current.canRedo);
    });

    return () => {
      unsubStroke();
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
    setToastMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    requestAnimationFrame(() => {
      setToastVisible(true);
    });
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2000);
  }, []);

  const handleUndo = useCallback(async () => {
    if (!rendererRef.current || !undoManagerRef.current.canUndo) return;
    if (fadeState !== 'idle') return;

    setFadeState('fading-out');

    setTimeout(async () => {
      await rendererRef.current?.undo();
      setFadeState('fading-in');
      setTimeout(() => {
        setFadeState('idle');
      }, 200);
    }, 200);
  }, [fadeState]);

  const handleRedo = useCallback(async () => {
    if (!rendererRef.current || !undoManagerRef.current.canRedo) return;
    if (fadeState !== 'idle') return;

    setFadeState('fading-out');

    setTimeout(async () => {
      await rendererRef.current?.redo();
      setFadeState('fading-in');
      setTimeout(() => {
        setFadeState('idle');
      }, 200);
    }, 200);
  }, [fadeState]);

  const handleSave = useCallback(() => {
    if (!rendererRef.current || !canvasRef.current) return;

    const dataUrl = rendererRef.current.getCanvasDataUrlForSave();

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
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('作品已保存！');
  }, [showToast]);

  const handleColorChange = useCallback((color: string) => {
    setCurrentColor(color);
  }, []);

  const canvasOpacity = fadeState === 'fading-out' ? 0.5 : 1;
  const canvasTransition = fadeState !== 'idle'
    ? 'opacity 0.2s ease-out'
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
              opacity: canvasOpacity,
              transition: canvasTransition,
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

        <div
          className={`graffiti-toast ${toastVisible ? 'visible' : ''}`}
        >
          {toastMessage}
        </div>
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
              opacity: canvasOpacity,
              transition: canvasTransition,
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

      <div
        className={`graffiti-toast ${toastVisible ? 'visible' : ''}`}
      >
        {toastMessage}
      </div>
    </div>
  );
}

export default App;
