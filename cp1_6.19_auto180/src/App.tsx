import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { gameEngine, type GameState, type FusionResult, type RecipeNode } from './GameEngine';
import { ElementRenderer } from './ElementRenderer';
import { getElementById, getTotalElementCount, type Element } from './ElementData';

interface DragState {
  isDragging: boolean;
  elementId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  fromCanvas: boolean;
  slotIndex?: number;
}

interface TreeViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => gameEngine.getState());
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [showUnlockTip, setShowUnlockTip] = useState<boolean>(false);
  const [treeState, setTreeState] = useState<TreeViewState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [treeDragging, setTreeDragging] = useState<{ active: boolean; startX: number; startY: number }>({
    active: false,
    startX: 0,
    startY: 0
  });
  const [virtualScroll, setVirtualScroll] = useState<VirtualScrollState>({ startIndex: 0, endIndex: 50 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    elementId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    fromCanvas: false
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ElementRenderer | null>(null);
  const fusionPlatformRef = useRef<HTMLDivElement>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = gameEngine.addStateListener((state) => {
      setGameState(state);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = gameEngine.addFusionListener((result: FusionResult) => {
      if (rendererRef.current) {
        rendererRef.current.playFusionAnimation(result);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new ElementRenderer(canvasRef.current);
      rendererRef.current.setCallbacks(
        () => gameEngine.tryFusion()
      );
      rendererRef.current.setMobile(isMobile);
    }
    return () => {
      if (rendererRef.current) {
        rendererRef.current.stop();
        rendererRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSlotElement(0, gameState.slots[0].elementId);
      rendererRef.current.setSlotElement(1, gameState.slots[1].elementId);
    }
  }, [gameState.slots]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setMobile(isMobile);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (rendererRef.current) {
        rendererRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const recipeTree = useMemo(() => gameEngine.getRecipeTree(), [gameState.unlockedElements]);
  const unlockedElements = useMemo(() => gameEngine.getUnlockedElementsList(), [gameState]);
  const allElements = useMemo(() => gameEngine.getAllElements(), []);

  const treeNodes = useMemo(() => {
    const unlocked = new Set(recipeTree.map(n => n.elementId));
    const nodes: Array<RecipeNode & { unlocked: boolean }> = [];
    for (const n of recipeTree) {
      nodes.push({ ...n, unlocked: true });
    }
    for (const el of allElements) {
      if (!unlocked.has(el.id)) {
        nodes.push({ elementId: el.id, parents: [], depth: 99, unlocked: false });
      }
    }
    return nodes;
  }, [recipeTree, allElements]);

  const startDragFromLibrary = useCallback((e: React.MouseEvent | React.TouchEvent, elementId: string) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragState({
      isDragging: true,
      elementId,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      fromCanvas: false
    });
  }, []);

  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (dragState.fromCanvas && rendererRef.current && dragState.slotIndex !== undefined) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          rendererRef.current.updateDragPosition(clientX - rect.left, clientY - rect.top);
        }
      }

      setDragState(prev => ({ ...prev, currentX: clientX, currentY: clientY }));
    };

    const handleUp = (e: MouseEvent | TouchEvent) => {
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

      if (dragState.fromCanvas && rendererRef.current) {
        rendererRef.current.endDrag();
      } else if (dragState.elementId) {
        const platform = fusionPlatformRef.current;
        if (platform) {
          const rect = platform.getBoundingClientRect();
          if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
            if (!gameState.slots[0].elementId) {
              gameEngine.placeElementInSlot(0, dragState.elementId);
            } else if (!gameState.slots[1].elementId) {
              gameEngine.placeElementInSlot(1, dragState.elementId);
            } else {
              gameEngine.placeElementInSlot(1, dragState.elementId);
            }
          }
        }
      }

      setDragState({
        isDragging: false,
        elementId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        fromCanvas: false
      });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragState, gameState.slots]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ballIndex = rendererRef.current.getBallAtPosition(x, y);
    if (ballIndex !== null) {
      const slot = gameState.slots[ballIndex];
      if (slot.elementId) {
        rendererRef.current.startDrag(ballIndex);
        gameEngine.clearSlot(ballIndex as 0 | 1);
        setDragState({
          isDragging: true,
          elementId: slot.elementId,
          startX: clientX,
          startY: clientY,
          currentX: clientX,
          currentY: clientY,
          fromCanvas: true,
          slotIndex: ballIndex
        });
      }
    }
  }, [gameState.slots]);

  const handleTreeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setTreeDragging({ active: true, startX: e.clientX - treeState.offsetX, startY: e.clientY - treeState.offsetY });
  }, [treeState]);

  useEffect(() => {
    if (!treeDragging.active) return;

    const handleMove = (e: MouseEvent) => {
      setTreeState(prev => ({
        ...prev,
        offsetX: e.clientX - treeDragging.startX,
        offsetY: e.clientY - treeDragging.startY
      }));
    };

    const handleUp = () => {
      setTreeDragging(prev => ({ ...prev, active: false }));
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [treeDragging]);

  const handleTreeWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTreeState(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(2, prev.scale * delta))
    }));
  }, []);

  const handleTreeScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const rowHeight = 70;
    const visibleRows = Math.ceil(target.clientHeight / rowHeight) + 5;
    const startIdx = Math.floor(target.scrollTop / rowHeight);
    setVirtualScroll({
      startIndex: Math.max(0, startIdx - 2),
      endIndex: startIdx + visibleRows
    });
  }, []);

  const toggleFavorite = useCallback((elementId: string) => {
    gameEngine.toggleFavorite(elementId);
  }, []);

  const handleLockedNodeClick = useCallback(() => {
    setShowUnlockTip(true);
    setTimeout(() => setShowUnlockTip(false), 2000);
  }, []);

  const progressPercent = (gameEngine.getUnlockedCount() / getTotalElementCount()) * 100;

  const renderElementBall = (element: Element, isFavorite: boolean, size: number = 50) => {
    const s = isMobile ? size * 0.8 : size;
    return (
      <div
        className="element-ball-wrapper"
        style={{
          width: s,
          height: s,
          position: 'relative',
          cursor: 'grab',
          transition: 'transform 0.2s ease',
          border: isFavorite ? '3px solid #FFD700' : 'none',
          borderRadius: '50%',
          boxSizing: 'content-box'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.15)';
          setHoveredElement(element.id);
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
          setHoveredElement(null);
        }}
        onMouseDown={(e) => startDragFromLibrary(e, element.id)}
        onTouchStart={(e) => startDragFromLibrary(e, element.id)}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${element.colorLight}, ${element.color} 50%, ${element.color}AA 100%)`,
            boxShadow: `0 0 ${s * 0.4}px ${element.color}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: s * 0.32,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            userSelect: 'none'
          }}
        >
          {element.name}
        </div>
        {isFavorite && (
          <div
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              fontSize: 14,
              filter: 'drop-shadow(0 0 3px #FFD700)'
            }}
          >
            ⭐
          </div>
        )}
      </div>
    );
  };

  const renderTreeNode = (node: RecipeNode & { unlocked: boolean }) => {
    const element = getElementById(node.elementId);
    if (!element) return null;

    const nodeWidth = 80;
    const nodeHeight = 60;
    const hSpacing = 120;
    const vSpacing = 80;
    const depthNodes = treeNodes.filter(n => n.depth === node.depth);
    const idxInDepth = depthNodes.findIndex(n => n.elementId === node.elementId);

    const x = treeState.offsetX + node.depth * hSpacing + (idxInDepth % 3) * (nodeWidth + 20);
    const y = treeState.offsetY + Math.floor(idxInDepth / 3) * vSpacing + node.depth * 20;

    if (!node.unlocked) {
      return (
        <div
          key={node.elementId}
          onClick={handleLockedNodeClick}
          style={{
            position: 'absolute',
            left: x * treeState.scale,
            top: y * treeState.scale,
            width: nodeWidth * treeState.scale,
            height: nodeHeight * treeState.scale,
            background: 'rgba(80, 80, 100, 0.5)',
            borderRadius: 8,
            border: '2px dashed rgba(150, 150, 170, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(180, 180, 200, 0.7)',
            fontSize: 24 * treeState.scale,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(180, 180, 200, 0.8)';
            (e.currentTarget as HTMLDivElement).style.background = 'rgba(100, 100, 120, 0.6)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(150, 150, 170, 0.4)';
            (e.currentTarget as HTMLDivElement).style.background = 'rgba(80, 80, 100, 0.5)';
          }}
        >
          ?
        </div>
      );
    }

    const recipePath = gameEngine.getRecipePath(node.elementId);
    const isFav = gameState.favoriteElements.has(node.elementId);

    return (
      <React.Fragment key={node.elementId}>
        {node.parents.map(parentId => {
          const parentNode = treeNodes.find(n => n.elementId === parentId);
          if (!parentNode) return null;
          const parentIdxInDepth = depthNodes.filter(n => n.depth === parentNode.depth)
            .findIndex(n => n.elementId === parentId);
          const px = treeState.offsetX + parentNode.depth * hSpacing + (parentIdxInDepth % 3) * (nodeWidth + 20) + nodeWidth / 2;
          const py = treeState.offsetY + Math.floor(parentIdxInDepth / 3) * vSpacing + parentNode.depth * 20 + nodeHeight / 2;
          const parentUnlocked = gameState.unlockedElements.has(parentId);

          return (
            <svg
              key={`${parentId}-${node.elementId}`}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible'
              }}
            >
              <line
                x1={px * treeState.scale}
                y1={py * treeState.scale}
                x2={(x + nodeWidth / 2) * treeState.scale}
                y2={(y + nodeHeight / 2) * treeState.scale}
                stroke={parentUnlocked ? element.color : 'rgba(150, 150, 170, 0.3)'}
                strokeWidth={parentUnlocked ? 2 : 1}
                strokeDasharray={parentUnlocked ? 'none' : '4,4'}
                opacity={parentUnlocked ? 0.6 : 0.3}
              />
            </svg>
          );
        })}
        <div
          onMouseEnter={() => setHoveredElement(node.elementId)}
          onMouseLeave={() => setHoveredElement(null)}
          onClick={() => toggleFavorite(node.elementId)}
          style={{
            position: 'absolute',
            left: x * treeState.scale,
            top: y * treeState.scale,
            width: nodeWidth * treeState.scale,
            height: nodeHeight * treeState.scale,
            background: `linear-gradient(135deg, ${element.color}CC, ${element.color}88)`,
            borderRadius: 10,
            border: isFav ? `2px solid #FFD700` : `2px solid ${element.color}`,
            boxShadow: `0 4px 15px ${element.color}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div style={{ fontSize: 16 * treeState.scale, fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {element.name}
          </div>
          {isFav && <div style={{ fontSize: 12 * treeState.scale }}>⭐</div>}
          {hoveredElement === node.elementId && recipePath && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 8,
                padding: '6px 10px',
                background: 'rgba(20, 20, 40, 0.95)',
                borderRadius: 6,
                fontSize: 12,
                whiteSpace: 'nowrap',
                border: '1px solid rgba(150, 120, 255, 0.5)',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            >
              {recipePath}
            </div>
          )}
        </div>
      </React.Fragment>
    );
  };

  const visibleNodes = treeNodes.length > 100
    ? treeNodes.slice(virtualScroll.startIndex, virtualScroll.endIndex)
    : treeNodes;

  const favoriteElements = unlockedElements.filter(el => gameState.favoriteElements.has(el.id));
  const otherElements = unlockedElements.filter(el => !gameState.favoriteElements.has(el.id));

  const layoutStyle = isMobile ? {
    flexDirection: 'column' as const,
    gap: '12px'
  } : {
    flexDirection: 'row' as const,
    gap: '16px'
  };

  const panelSize = isMobile ? {
    width: '100%',
    height: 'auto',
    minHeight: '200px'
  } : {
    width: '260px',
    height: '100%'
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(ellipse at center, #1a0a3e 0%, #0a0a2e 50%, #050515 100%)',
        display: 'flex',
        ...layoutStyle,
        padding: isMobile ? '10px' : '16px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div
        style={{
          ...panelSize,
          background: 'rgba(30, 20, 60, 0.6)',
          borderRadius: 16,
          border: '1px solid rgba(120, 100, 200, 0.3)',
          backdropFilter: 'blur(12px)',
          padding: isMobile ? '12px' : '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ color: '#CCBBFF', fontSize: isMobile ? 14 : 16, fontWeight: 'bold' }}>
          ✨ 元素库
        </div>

        <div
          style={{
            width: '100%',
            marginBottom: 4
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#AA99CC', fontSize: 12 }}>
              已解锁 {gameEngine.getUnlockedCount()}/{getTotalElementCount()}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 6,
              background: 'rgba(80, 60, 140, 0.5)',
              borderRadius: 3,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #8866FF, #AA88FF)',
                borderRadius: 3,
                width: `${progressPercent}%`,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        <div style={{ color: '#FFD700', fontSize: 12, marginTop: 4 }}>
          ⭐ 收藏 ({favoriteElements.length})
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: isMobile ? '6px' : '10px',
            justifyItems: 'center'
          }}
        >
          {favoriteElements.map(el => (
            <React.Fragment key={el.id}>
              {renderElementBall(el, true, isMobile ? 36 : 45)}
            </React.Fragment>
          ))}
        </div>

        <div style={{ color: '#AA99CC', fontSize: 12 }}>
          全部元素 ({otherElements.length})
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: isMobile ? '6px' : '10px',
            justifyItems: 'center',
            flex: 1,
            overflowY: 'auto',
            paddingBottom: 8
          }}
        >
          {otherElements.map(el => (
            <React.Fragment key={el.id}>
              {renderElementBall(el, false, isMobile ? 36 : 45)}
            </React.Fragment>
          ))}
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(120, 100, 200, 0.2)',
            paddingTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ color: '#AA99CC', fontSize: 12 }}>📊 统计</div>
          <div style={{ color: '#DDCCFF', fontSize: 11 }}>
            尝试融合: <span style={{ color: '#88AAFF' }}>{gameState.stats.totalFusions}</span>
          </div>
          <div style={{ color: '#DDCCFF', fontSize: 11 }}>
            成功融合: <span style={{ color: '#66FFAA' }}>{gameState.stats.successfulFusions}</span>
          </div>
          <div style={{ color: '#DDCCFF', fontSize: 11 }}>
            成功率: <span style={{ color: '#FFDD66' }}>
              {gameState.stats.totalFusions > 0
                ? ((gameState.stats.successfulFusions / gameState.stats.totalFusions) * 100).toFixed(1)
                : '0.0'}%
            </span>
          </div>
        </div>
      </div>

      <div
        ref={fusionPlatformRef}
        style={{
          flex: 1,
          minHeight: isMobile ? '300px' : undefined,
          background: 'rgba(20, 15, 45, 0.4)',
          borderRadius: 16,
          border: '1px solid rgba(120, 100, 200, 0.2)',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 0 60px rgba(80, 60, 160, 0.2)'
        }}
        onMouseDown={handleCanvasMouseDown}
        onTouchStart={handleCanvasMouseDown}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: dragState.isDragging ? 'grabbing' : 'default'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: isMobile ? 8 : 16,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#CCBBFF',
            fontSize: isMobile ? 14 : 18,
            fontWeight: 'bold',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}
        >
          ⚗️ 融合台
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: isMobile ? 8 : 16,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#8877AA',
            fontSize: isMobile ? 10 : 12,
            pointerEvents: 'none',
            textAlign: 'center'
          }}
        >
          从左侧拖拽两个元素到台上进行融合
        </div>
      </div>

      <div
        style={{
          ...panelSize,
          background: 'rgba(30, 20, 60, 0.6)',
          borderRadius: 16,
          border: '1px solid rgba(120, 100, 200, 0.3)',
          backdropFilter: 'blur(12px)',
          padding: isMobile ? '12px' : '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ color: '#CCBBFF', fontSize: isMobile ? 14 : 16, fontWeight: 'bold', marginBottom: 8 }}>
          📜 配方图谱
        </div>
        <div style={{ color: '#7766AA', fontSize: 10, marginBottom: 8 }}>
          拖拽移动 · 滚轮缩放 · 点击元素收藏
        </div>
        <div
          ref={treeContainerRef}
          onMouseDown={handleTreeMouseDown}
          onWheel={handleTreeWheel}
          onScroll={handleTreeScroll}
          style={{
            flex: 1,
            position: 'relative',
            overflow: treeNodes.length > 100 ? 'auto' : 'hidden',
            cursor: treeDragging.active ? 'grabbing' : 'grab',
            background: 'rgba(15, 10, 35, 0.5)',
            borderRadius: 10,
            border: '1px solid rgba(80, 60, 140, 0.3)',
            minHeight: isMobile ? '200px' : '300px'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: treeNodes.length > 100 ? '100%' : `${1200 * treeState.scale}px`,
              height: treeNodes.length > 100 ? `${treeNodes.length * 70}px` : `${800 * treeState.scale}px`
            }}
          >
            {visibleNodes.map((node) => renderTreeNode(node))}
          </div>
        </div>
      </div>

      {dragState.isDragging && !dragState.fromCanvas && dragState.elementId && (() => {
        const el = getElementById(dragState.elementId);
        if (!el) return null;
        const s = isMobile ? 36 : 45;
        return (
          <div
            style={{
              position: 'fixed',
              left: dragState.currentX - s / 2,
              top: dragState.currentY - s / 2,
              width: s,
              height: s,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${el.colorLight}, ${el.color} 50%, ${el.color}AA 100%)`,
              boxShadow: `0 0 ${s * 0.5}px ${el.color}AA`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: s * 0.32,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
              zIndex: 10000,
              transform: 'scale(1.1)',
              transition: 'transform 0.1s ease'
            }}
          >
            {el.name}
          </div>
        );
      })()}

      {showUnlockTip && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '16px 28px',
            background: 'rgba(30, 20, 60, 0.95)',
            borderRadius: 12,
            border: '2px solid rgba(255, 100, 100, 0.6)',
            color: '#FFCCCC',
            fontSize: 16,
            fontWeight: 'bold',
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(255, 50, 50, 0.3)',
            animation: 'fadeInOut 2s ease'
          }}
        >
          💡 尝试不同组合
        </div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(30, 20, 60, 0.5);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(120, 100, 200, 0.5);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(140, 120, 220, 0.7);
        }
      `}</style>
    </div>
  );
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}

export default App;
