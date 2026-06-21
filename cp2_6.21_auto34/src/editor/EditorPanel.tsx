import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { GameElement, GameState, TemplateType } from '../types';
import { LayerPanel } from './LayerPanel';
import { PropPanel } from './PropPanel';
import { GameEngine } from '../engine/GameEngine';
import { RenderCanvas } from '../engine/RenderCanvas';
import { ExportManager } from '../engine/ExportManager';
import { createDefaultElement, getElementAABB, aabbIntersect } from '../utils/helpers';
import { getTemplate, TEMPLATE_META } from '../utils/templates';

interface EditorPanelProps {}

type DragMode = 'move' | 'resize' | 'none';

export const EditorPanel: React.FC<EditorPanelProps> = () => {
  const [elements, setElements] = useState<GameElement[]>(() => getTemplate('parkour'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fps, setFps] = useState(0);
  const [score, setScore] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [exportTitle, setExportTitle] = useState('我的游戏');
  const [exportAuthor, setExportAuthor] = useState('匿名');
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeMsg, setWelcomeMsg] = useState(TEMPLATE_META.parkour.welcome);
  const [layerWidth, setLayerWidth] = useState(300);
  const [propWidth, setPropWidth] = useState(280);
  const [isMobile, setIsMobile] = useState(false);
  const [propModalOpen, setPropModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const engineRef = useRef<GameEngine | null>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const editorRenderRef = useRef<RenderCanvas | null>(null);
  const gameRenderRef = useRef<RenderCanvas | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ mode: DragMode; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; handle: string } | null>(null);

  useEffect(() => {
    engineRef.current = new GameEngine();
    engineRef.current.setElements(elements);
    engineRef.current.onFrame((state: GameState) => {
      setFps(state.fps);
      setScore(state.score);
      setIsPaused(state.isPaused);
      if (gameRenderRef.current) {
        gameRenderRef.current.setState(state);
      }
    });
  }, []);

  useEffect(() => {
    if (editorCanvasRef.current && !editorRenderRef.current) {
      editorRenderRef.current = new RenderCanvas(editorCanvasRef.current);
      editorRenderRef.current.setEditorMode(true);
      updateEditorRender();
    }
    if (gameCanvasRef.current && !gameRenderRef.current) {
      gameRenderRef.current = new RenderCanvas(gameCanvasRef.current);
      gameRenderRef.current.setEditorMode(false);
    }
  }, []);

  useEffect(() => {
    const resize = () => {
      if (canvasWrapRef.current) {
        const w = canvasWrapRef.current.clientWidth;
        const h = canvasWrapRef.current.clientHeight;
        if (editorRenderRef.current) editorRenderRef.current.resize(w, h);
        if (gameRenderRef.current) gameRenderRef.current.resize(w, h);
        if (engineRef.current) engineRef.current.setCanvasSize(w, h);
      }
      setIsMobile(window.innerWidth < 900);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const hashData = ExportManager.parseShareURL(window.location.hash);
    if (hashData && hashData.length > 0) {
      setElements(hashData);
      setShowWelcome(false);
    }
  }, []);

  useEffect(() => {
    updateEditorRender();
    if (!isRunning && engineRef.current) {
      engineRef.current.setElements(elements);
    }
  }, [elements, selectedId, isRunning]);

  const updateEditorRender = useCallback(() => {
    if (editorRenderRef.current) {
      editorRenderRef.current.setState({
        elements,
        isRunning: false,
        isPaused: false,
        score: 0,
        fps: 0,
        selectedElementId: selectedId,
        currentKey: null
      });
    }
  }, [elements, selectedId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRunning) {
        e.preventDefault();
        engineRef.current?.pause();
      }
      if (e.code === 'Escape' && isRunning) {
        stopGame();
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedId && !isRunning && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          removeElement(selectedId);
        }
      }
    },
    [isRunning, selectedId]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const addElement = (type: GameElement['type']) => {
    const wrap = canvasWrapRef.current;
    const x = wrap ? wrap.clientWidth / 2 + (Math.random() - 0.5) * 100 : 400;
    const y = wrap ? wrap.clientHeight / 2 + (Math.random() - 0.5) * 100 : 300;
    const el = createDefaultElement(type, x, y);
    el.zIndex = elements.length;
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const removeElement = (id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateElement = (id: string, props: Partial<GameElement>) => {
    setElements((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...props, physics: props.physics ? { ...e.physics, ...props.physics } : e.physics } : e))
    );
  };

  const reorderElements = (ids: string[]) => {
    setElements((prev) => {
      const map = new Map(prev.map((e) => [e.id, e]));
      const newList = ids.map((id, i) => {
        const el = map.get(id);
        return el ? { ...el, zIndex: i } : null;
      }).filter(Boolean) as GameElement[];
      return newList;
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (isRunning) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const hit = [...elements].reverse().find((el) => {
      const box = getElementAABB(el);
      return mx >= box.minX && mx <= box.maxX && my >= box.minY && my <= box.maxY;
    });

    if (hit) {
      setSelectedId(hit.id);
      draggingRef.current = {
        mode: 'move',
        startX: mx,
        startY: my,
        origX: hit.x,
        origY: hit.y,
        origW: hit.width,
        origH: hit.height,
        handle: ''
      };
    } else {
      setSelectedId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current || isRunning) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const drag = draggingRef.current;

    if (drag.mode === 'move' && selectedId) {
      updateElement(selectedId, {
        x: drag.origX + (mx - drag.startX),
        y: drag.origY + (my - drag.startY)
      });
    }
  };

  const handleCanvasMouseUp = () => {
    draggingRef.current = null;
  };

  const startGame = () => {
    if (engineRef.current) {
      engineRef.current.setElements(elements);
      engineRef.current.setSelectedElementId(selectedId);
      engineRef.current.start();
      setIsRunning(true);
      setShowWelcome(false);
    }
  };

  const pauseGame = () => {
    engineRef.current?.pause();
  };

  const stopGame = () => {
    if (engineRef.current) {
      const currentEls = engineRef.current.getElements();
      setScore(engineRef.current.getScore());
      engineRef.current.stop();
      setIsRunning(false);
      setIsPaused(false);
      setElements(currentEls.map((e) => ({ ...e })));
    }
  };

  const exportHTML = () => {
    const html = ExportManager.generateHTML({
      title: exportTitle,
      author: exportAuthor,
      elements
    });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (exportTitle || 'game') + '.html';
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  };

  const copyShareLink = async () => {
    const link = ExportManager.generateShareURL(elements);
    try {
      await navigator.clipboard.writeText(link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const loadTemplate = (type: TemplateType) => {
    setElements(getTemplate(type));
    setSelectedId(null);
    setWelcomeMsg(TEMPLATE_META[type].welcome);
    setShowWelcome(true);
    setTimeout(() => setShowWelcome(false), 3500);
  };

  const startResizeLayer = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = layerWidth;
    const onMove = (ev: MouseEvent) => {
      setLayerWidth(Math.max(180, Math.min(500, startW + (ev.clientX - startX))));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startResizeProp = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = propWidth;
    const onMove = (ev: MouseEvent) => {
      setPropWidth(Math.max(200, Math.min(450, startW - (ev.clientX - startX))));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const selectedElement = elements.find((e) => e.id === selectedId) || null;

  return (
    <div className="editor-root">
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="logo">🎮 游戏沙盒</span>
          <div className="template-select">
            <button onClick={() => loadTemplate('parkour')} className="tpl-btn">跑酷</button>
            <button onClick={() => loadTemplate('platformer')} className="tpl-btn">平台跳跃</button>
            <button onClick={() => loadTemplate('shooter')} className="tpl-btn">弹幕射击</button>
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-run" onClick={startGame} disabled={isRunning}>
            ▶ 运行
          </button>
          <button className="btn btn-pause" onClick={pauseGame} disabled={!isRunning}>
            {isPaused ? '▶ 继续' : '⏸ 暂停'}
          </button>
          <button className="btn btn-export" onClick={() => setShowExport(true)}>
            ⬇ 导出
          </button>
          <button className="btn btn-share" onClick={copyShareLink}>
            {shareCopied ? '✓ 已复制' : '🔗 分享'}
          </button>
        </div>
      </div>

      <div className="editor-body">
        {!isMobile && (
          <>
            <div className="layer-panel-wrap" style={{ width: layerWidth }}>
              <LayerPanel
                elements={elements}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onReorder={reorderElements}
                onAdd={addElement}
                onRemove={removeElement}
              />
            </div>
            <div className="resizer resizer-left" onMouseDown={startResizeLayer} />
          </>
        )}

        <div className="canvas-area" ref={canvasWrapRef}>
          <canvas
            className={`editor-canvas ${isRunning ? 'hidden' : ''}`}
            ref={editorCanvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
          <canvas
            className={`game-canvas ${isRunning ? '' : 'hidden'}`}
            ref={gameCanvasRef}
          />
          {showWelcome && (
            <div className="welcome-tip">
              <div className="welcome-content">{welcomeMsg}</div>
            </div>
          )}
          {isMobile && selectedId && (
            <button className="mobile-prop-btn" onClick={() => setPropModalOpen(true)}>
              ⚙ 属性
            </button>
          )}
          {isRunning && (
            <button className="exit-btn" onClick={stopGame}>
              ✕ 退出
            </button>
          )}
        </div>

        {!isMobile && (
          <>
            <div className="resizer resizer-right" onMouseDown={startResizeProp} />
            <div className="prop-panel-wrap" style={{ width: propWidth }}>
              <PropPanel element={selectedElement} onUpdate={updateElement} />
            </div>
          </>
        )}
      </div>

      {showExport && (
        <div className="modal-overlay" onClick={() => setShowExport(false)}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <h2>导出游戏</h2>
            <div className="modal-row">
              <label>游戏标题</label>
              <input
                type="text"
                value={exportTitle}
                onChange={(e) => setExportTitle(e.target.value)}
              />
            </div>
            <div className="modal-row">
              <label>作者名</label>
              <input
                type="text"
                value={exportAuthor}
                onChange={(e) => setExportAuthor(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-export" onClick={exportHTML}>
                下载HTML文件
              </button>
              <button className="btn-cancel" onClick={() => setShowExport(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {isMobile && propModalOpen && (
        <div className="modal-overlay" onClick={() => setPropModalOpen(false)}>
          <div
            className="mobile-prop-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-prop-header">
              <span>属性</span>
              <button onClick={() => setPropModalOpen(false)}>✕</button>
            </div>
            <div className="mobile-prop-body">
              <PropPanel element={selectedElement} onUpdate={updateElement} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
