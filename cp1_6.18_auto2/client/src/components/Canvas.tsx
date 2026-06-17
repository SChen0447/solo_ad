import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { SocketHookReturn } from '../hooks/useSocket';
import type { EditingUser } from '../hooks/useSocket';

type CanvasProps = SocketHookReturn;

interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
}

interface AlignLines {
  v: number | null;
  h: number | null;
}

const COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#a855f7', '#ef4444',
];

const Canvas: React.FC<CanvasProps> = ({
  nodes,
  selectedNodeId,
  setSelectedNodeId,
  editingNodeId,
  setEditingNodeId,
  currentUser,
  editingUsers,
  handleNodeMove,
  handleNodeTextChange,
  handleNodeColorChange,
  handleFocusNode,
  handleDeleteNode,
  canvasRef,
  NODE_SIZE,
  SNAP_DISTANCE,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [alignLines, setAlignLines] = useState<AlignLines>({ v: null, h: null });
  const [colorPickerNode, setColorPickerNode] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const nodeArr = useMemo(() => Object.values(nodes), [nodes]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = (sx - rect.left - view.x) / view.scale;
    const y = (sy - rect.top - view.y) / view.scale;
    return { x, y };
  }, [view]);

  const nodeEditingUsers = useMemo(() => {
    const result: Record<string, EditingUser[]> = {};
    editingUsers.forEach(u => {
      if (u.nodeId && (!currentUser || u.userId !== currentUser.userId)) {
        if (!result[u.nodeId]) result[u.nodeId] = [];
        result[u.nodeId].push(u);
      }
    });
    return result;
  }, [editingUsers, currentUser]);

  const renderConnections = useMemo(() => {
    const paths: React.ReactNode[] = [];
    nodeArr.forEach(node => {
      if (!node.parentId || !nodes[node.parentId]) return;
      const parent = nodes[node.parentId];
      const half = NODE_SIZE / 2;
      const x1 = parent.x + half;
      const y1 = parent.y + half;
      const x2 = node.x + half;
      const y2 = node.y + half;
      const dx = x2 - x1;
      const c1x = x1 + dx * 0.5;
      const c2x = x1 + dx * 0.5;
      const gradientId = `grad-${parent.id}-${node.id}`;
      const pathD = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;

      paths.push(
        <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={parent.color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={node.color} stopOpacity="0.8" />
        </linearGradient>
      );
      paths.push(
        <path
          key={`p-${node.id}`}
          d={pathD}
          stroke={`url(#${gradientId})`}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      );
    });
    return paths;
  }, [nodeArr, nodes, NODE_SIZE]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;

    const target = e.target as HTMLElement;
    const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;

    if (e.button === 1 || (e.button === 0 && e.altKey) || (!nodeEl && !target.closest('[data-color-picker]'))) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, vx: view.x, vy: view.y });
      setSelectedNodeId(null);
      setEditingNodeId(null);
      setColorPickerNode(null);
      handleFocusNode(null);
      return;
    }

    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id')!;
      setSelectedNodeId(nodeId);
      handleFocusNode(nodeId);

      if (editingNodeId === nodeId || target.tagName === 'INPUT' || target.closest('[data-color-btn]')) {
        return;
      }

      const { x: worldX, y: worldY } = screenToWorld(e.clientX, e.clientY);
      const node = nodes[nodeId];
      if (!node) return;

      setDragState({
        nodeId,
        startX: worldX,
        startY: worldY,
        origX: node.x,
        origY: node.y,
        moved: false,
      });
    }
  }, [view, setSelectedNodeId, setEditingNodeId, handleFocusNode, editingNodeId, screenToWorld, nodes]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setView(v => ({ ...v, x: panStart.vx + dx, y: panStart.vy + dy }));
      return;
    }

    if (dragState) {
      const { x: wx, y: wy } = screenToWorld(e.clientX, e.clientY);
      const half = NODE_SIZE / 2;
      let newX = dragState.origX + (wx - dragState.startX);
      let newY = dragState.origY + (wy - dragState.startY);

      let snapH: number | null = null;
      let snapV: number | null = null;

      Object.values(nodes).forEach(n => {
        if (n.id === dragState.nodeId) return;
        const dx = Math.abs(n.x - newX);
        const dy = Math.abs(n.y - newY);
        if (dx < SNAP_DISTANCE && (snapH === null || dx < Math.abs(snapH - newX))) {
          snapH = n.x;
        }
        if (dy < SNAP_DISTANCE && (snapV === null || dy < Math.abs(snapV - newY))) {
          snapV = n.y;
        }
      });

      if (snapH !== null) newX = snapH;
      if (snapV !== null) newY = snapV;

      setAlignLines({
        v: snapH !== null ? snapH + half : null,
        h: snapV !== null ? snapV + half : null,
      });

      if (Math.abs(newX - dragState.origX) > 2 || Math.abs(newY - dragState.origY) > 2) {
        setDragState(d => d ? { ...d, moved: true } : null);
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        handleNodeMove(dragState.nodeId, newX, newY, false);
      });
    }
  }, [isPanning, panStart, dragState, screenToWorld, nodes, NODE_SIZE, SNAP_DISTANCE, handleNodeMove]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (dragState) {
      const { x: wx, y: wy } = screenToWorld(e.clientX, e.clientY);
      let newX = dragState.origX + (wx - dragState.startX);
      let newY = dragState.origY + (wy - dragState.startY);

      Object.values(nodes).forEach(n => {
        if (n.id === dragState.nodeId) return;
        if (Math.abs(n.x - newX) < SNAP_DISTANCE) newX = n.x;
        if (Math.abs(n.y - newY) < SNAP_DISTANCE) newY = n.y;
      });

      handleNodeMove(dragState.nodeId, newX, newY, dragState.moved);
      setDragState(null);
      setAlignLines({ v: null, h: null });

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, [isPanning, dragState, screenToWorld, nodes, SNAP_DISTANCE, handleNodeMove]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(2.5, Math.max(0.3, view.scale * factor));
    const ratio = newScale / view.scale;

    setView(v => ({
      scale: newScale,
      x: mx - (mx - v.x) * ratio,
      y: my - (my - v.y) * ratio,
    }));
  }, [view]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id')!;
      setEditingNodeId(nodeId);
      handleFocusNode(nodeId);
    }
  }, [setEditingNodeId, handleFocusNode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingNodeId) {
        if (e.key === 'Enter') {
          setEditingNodeId(null);
        }
        if (e.key === 'Escape') {
          setEditingNodeId(null);
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        handleDeleteNode(selectedNodeId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingNodeId, selectedNodeId, setEditingNodeId, handleDeleteNode]);

  const svgBounds = useMemo(() => {
    if (nodeArr.length === 0) return { w: 2000, h: 2000, offX: -1000, offY: -1000 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodeArr.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + NODE_SIZE > maxX) maxX = n.x + NODE_SIZE;
      if (n.y + NODE_SIZE > maxY) maxY = n.y + NODE_SIZE;
    });
    const padding = 600;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    return { w, h, offX: minX - padding, offY: minY - padding };
  }, [nodeArr, NODE_SIZE]);

  const otherUsers = editingUsers.filter(u => !currentUser || u.userId !== currentUser.userId);

  return (
    <div
      ref={(el) => {
        if (el) {
          (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
        if (containerRef) (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : (dragState ? 'grabbing' : 'default'),
        backgroundColor: '#1a1a2e',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: `${20 * view.scale}px ${20 * view.scale}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          width: svgBounds.w,
          height: svgBounds.h,
          left: 0,
          top: 0,
        }}
      >
        <svg
          width={svgBounds.w}
          height={svgBounds.h}
          viewBox={`${svgBounds.offX} ${svgBounds.offY} ${svgBounds.w} ${svgBounds.h}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <defs>{renderConnections.filter((_, i) => i % 2 === 0)}</defs>
          <g>{renderConnections.filter((_, i) => i % 2 === 1)}</g>
          {alignLines.v !== null && (
            <line
              x1={alignLines.v}
              y1={svgBounds.offY}
              x2={alignLines.v}
              y2={svgBounds.offY + svgBounds.h}
              stroke="rgba(224,231,255,0.5)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
          {alignLines.h !== null && (
            <line
              x1={svgBounds.offX}
              y1={alignLines.h}
              x2={svgBounds.offX + svgBounds.w}
              y2={alignLines.h}
              stroke="rgba(224,231,255,0.5)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {nodeArr.map(node => {
          const users = nodeEditingUsers[node.id] || [];
          const isSelected = selectedNodeId === node.id;
          const isEditing = editingNodeId === node.id;

          return (
            <div
              key={node.id}
              data-node-id={node.id}
              onContextMenu={(e) => {
                e.preventDefault();
                setColorPickerNode(prev => prev === node.id ? null : node.id);
              }}
              style={{
                position: 'absolute',
                left: node.x - (svgBounds.offX),
                top: node.y - (svgBounds.offY),
                width: NODE_SIZE,
                height: NODE_SIZE,
                transform: isEditing ? 'scale(1.1)' : (isSelected ? 'scale(1.05)' : 'scale(1)'),
                transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
                zIndex: isSelected ? 10 : (isEditing ? 20 : 1),
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: node.color,
                  boxShadow: isSelected
                    ? `0 0 0 3px rgba(224,231,255,0.6), 0 4px 12px rgba(0,0,0,0.3)`
                    : `0 4px 12px rgba(0,0,0,0.3)`,
                  border: isEditing ? '2px solid #e0e7ff' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'move',
                  userSelect: 'none',
                  overflow: 'hidden',
                }}
              >
                {isEditing ? (
                  <input
                    autoFocus
                    defaultValue={node.text}
                    onBlur={(e) => {
                      handleNodeTextChange(node.id, e.target.value);
                      setEditingNodeId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleNodeTextChange(node.id, (e.target as HTMLInputElement).value);
                        setEditingNodeId(null);
                      }
                      if (e.key === 'Escape') {
                        setEditingNodeId(null);
                      }
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      width: '80%',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      border: 'none',
                      outline: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                      borderRadius: '4px',
                      padding: '4px 6px',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                      padding: '4px',
                      lineHeight: 1.2,
                      wordBreak: 'break-word',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  >
                    {node.text}
                  </span>
                )}
              </div>

              {users.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '-4px',
                  }}
                >
                  {users.slice(0, 3).map(u => (
                    <div
                      key={u.userId}
                      title={`${u.userName} 正在编辑`}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        backgroundColor: u.color,
                        border: '2px solid #1a1a2e',
                        marginLeft: users.indexOf(u) > 0 ? -5 : 0,
                        boxShadow: `0 0 6px ${u.color}`,
                        animation: 'pulse-ring 1.5s ease-in-out infinite',
                      }}
                    />
                  ))}
                </div>
              )}

              {colorPickerNode === node.id && (
                <div
                  data-color-picker
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: NODE_SIZE + 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(26,26,46,0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    padding: '10px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    width: '140px',
                    zIndex: 100,
                    border: '1px solid rgba(224,231,255,0.15)',
                  }}
                >
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c}
                      data-color-btn
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNodeColorChange(node.id, c);
                        setColorPickerNode(null);
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: node.color === c ? '2px solid #e0e7ff' : '2px solid transparent',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(26,26,46,0.7)',
            backdropFilter: 'blur(8px)',
            padding: '6px 12px',
            borderRadius: '8px',
            color: '#e0e7ff',
            fontSize: '12px',
            fontFamily: 'monospace',
            border: '1px solid rgba(224,231,255,0.1)',
          }}
        >
          缩放: {Math.round(view.scale * 100)}%
        </div>
        {currentUser && (
          <div
            style={{
              backgroundColor: 'rgba(26,26,46,0.7)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: '8px',
              color: '#e0e7ff',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(224,231,255,0.1)',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: currentUser.color,
              }}
            />
            {currentUser.userName}
          </div>
        )}
        {otherUsers.length > 0 && (
          <div
            style={{
              backgroundColor: 'rgba(26,26,46,0.7)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: '8px',
              color: '#e0e7ff',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              border: '1px solid rgba(224,231,255,0.1)',
            }}
          >
            <div style={{ opacity: 0.7 }}>在线用户:</div>
            {otherUsers.map(u => (
              <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: u.color,
                  }}
                />
                {u.userName}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          backgroundColor: 'rgba(26,26,46,0.7)',
          backdropFilter: 'blur(8px)',
          padding: '8px 12px',
          borderRadius: '8px',
          color: 'rgba(224,231,255,0.7)',
          fontSize: '11px',
          lineHeight: 1.6,
          border: '1px solid rgba(224,231,255,0.1)',
        }}
      >
        <div>拖拽空白/Alt+拖拽: 平移画布 · 滚轮: 缩放</div>
        <div>双击节点: 编辑文字 · 右键节点: 改颜色 · Delete: 删除节点</div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 4px currentColor, 0 0 0 0 currentColor; }
          50% { box-shadow: 0 0 8px currentColor, 0 0 0 4px transparent; }
        }
        @keyframes ripple {
          to { transform: scale(4); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Canvas;
