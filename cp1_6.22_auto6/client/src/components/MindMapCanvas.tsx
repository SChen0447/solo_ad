import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toPng } from 'html-to-image';
import { NodeData, OnlineUser } from '../hooks/useSocket';

interface MindMapCanvasProps {
  mindmapId: string;
  nodes: Map<string, NodeData>;
  users: OnlineUser[];
  currentUser: OnlineUser | null;
  readOnly: boolean;
  createNode: (node: Omit<NodeData, 'created_at' | 'updated_at'>) => void;
  updateNode: (id: string, updates: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  moveCursor: (x: number, y: number) => void;
  setEditingNode: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onBack: () => void;
  onShare: () => void;
}

const COLOR_PALETTE = [
  '#FFE5E5', '#E5F0FF', '#E8FFE5', '#FFF3E5', '#F5E5FF',
  '#E5FFF8', '#FFE5F0', '#F0FFE5', '#FFFAE5', '#E5E8FF'
];

const LEVEL_COLORS: Record<number, string> = {
  0: '#D6E8F8',
  1: '#D6F0DC',
  2: '#FFE4C4'
};

const NODE_PADDING_X = 16;
const NODE_PADDING_Y = 10;
const NODE_MIN_WIDTH = 80;
const NODE_FONT_SIZE = 14;

function measureTextWidth(text: string, bold: boolean): number {
  const canvas = (measureTextWidth as any)._canvas || ((measureTextWidth as any)._canvas = document.createElement('canvas'));
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${bold ? 'bold ' : ''}${NODE_FONT_SIZE}px -apple-system, "Segoe UI", sans-serif`;
  return ctx.measureText(text).width;
}

function getNodeSize(node: NodeData): { width: number; height: number } {
  const textWidth = measureTextWidth(node.text || ' ', node.font_bold === 1);
  const lines = Math.max(1, Math.ceil(textWidth / 200));
  const width = Math.max(NODE_MIN_WIDTH, Math.min(200, textWidth) + NODE_PADDING_X * 2);
  const height = lines * NODE_FONT_SIZE * 1.5 + NODE_PADDING_Y * 2;
  return { width, height };
}

export default function MindMapCanvas(props: MindMapCanvasProps) {
  const {
    mindmapId, nodes, users, currentUser, readOnly,
    createNode, updateNode, deleteNode, moveCursor, setEditingNode,
    undo, redo, canUndo, canRedo, onBack, onShare
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasLayerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeIdLocal] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, offX: 0, offY: 0 });
  const [showNotePanel, setShowNotePanel] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [nodeSizes, setNodeSizes] = useState<Map<string, { width: number; height: number }>>(new Map());
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const nodeAnimsRef = useRef<Set<string>>(new Set());
  const [, forceRender] = useState(0);
  const cursorThrottleRef = useRef<number>(0);
  const lastCursorPosRef = useRef<{ x: number; y: number } | null>(null);

  scaleRef.current = scale;
  offsetRef.current = offset;

  useEffect(() => {
    const sizes = new Map<string, { width: number; height: number }>();
    nodes.forEach((node) => {
      sizes.set(node.id, getNodeSize(node));
    });
    setNodeSizes(sizes);
  }, [nodes]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (sx - rect.left - offsetRef.current.x) / scaleRef.current;
    const y = (sy - rect.top - offsetRef.current.y) / scaleRef.current;
    return { x, y };
  }, []);

  const emitCursorMove = useCallback((wx: number, wy: number) => {
    const now = performance.now();
    if (now - cursorThrottleRef.current > 30) {
      cursorThrottleRef.current = now;
      moveCursor(wx, wy);
    } else {
      lastCursorPosRef.current = { x: wx, y: wy };
    }
  }, [moveCursor]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastCursorPosRef.current) {
        moveCursor(lastCursorPosRef.current.x, lastCursorPosRef.current.y);
        lastCursorPosRef.current = null;
      }
    }, 60);
    return () => clearInterval(interval);
  }, [moveCursor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingNodeId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' && e.shiftKey || e.key === 'y')) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Tab' && selectedNodeId) {
        e.preventDefault();
        const parent = nodes.get(selectedNodeId);
        if (parent && !readOnly) {
          const id = uuidv4();
          const siblings = Array.from(nodes.values()).filter(n => n.parent_id === selectedNodeId);
          const size = nodeSizes.get(selectedNodeId) || { width: 100, height: 50 };
          const newX = parent.x + size.width + 100;
          const newY = parent.y + (siblings.length - (siblings.length > 0 ? siblings.length - 1 : 0)) * 70 - 35;
          createNode({
            id,
            mindmap_id: mindmapId,
            parent_id: selectedNodeId,
            text: '新想法',
            x: newX,
            y: newY,
            level: parent.level + 1,
            bg_color: null,
            border_width: 1,
            font_bold: 0,
            note: null
          });
          nodeAnimsRef.current.add(id);
          forceRender(n => n + 1);
          setTimeout(() => {
            nodeAnimsRef.current.delete(id);
            forceRender(n => n + 1);
          }, 200);
          setTimeout(() => {
            setSelectedNodeId(id);
            setEditingNodeIdLocal(id);
            setEditingText('新想法');
            setEditingNode(id);
          }, 100);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && !readOnly) {
          e.preventDefault();
          deleteNode(selectedNodeId);
          setSelectedNodeId(null);
          setShowToolbar(false);
          setShowNotePanel(false);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingNodeId, selectedNodeId, nodes, nodeSizes, readOnly, undo, redo, createNode, deleteNode, setEditingNode, mindmapId]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = (mx - offsetRef.current.x) / scaleRef.current;
    const worldY = (my - offsetRef.current.y) / scaleRef.current;
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(0.2, Math.min(3, scaleRef.current * (1 + delta)));
    const newOffX = mx - worldX * newScale;
    const newOffY = my - worldY * newScale;
    setScale(newScale);
    setOffset({ x: newOffX, y: newOffY });
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || e.target === svgRef.current || e.target === canvasLayerRef.current) {
      if (e.button === 1 || e.altKey || readOnly) {
        setPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY, offX: offsetRef.current.x, offY: offsetRef.current.y });
      } else {
        setSelectedNodeId(null);
        setShowToolbar(false);
      }
      return;
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    if (e.target !== containerRef.current && e.target !== svgRef.current && e.target !== canvasLayerRef.current) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const id = uuidv4();
    createNode({
      id,
      mindmap_id: mindmapId,
      parent_id: null,
      text: '中心主题',
      x: world.x - 50,
      y: world.y - 25,
      level: 0,
      bg_color: null,
      border_width: 1,
      font_bold: 0,
      note: null
    });
    nodeAnimsRef.current.add(id);
    forceRender(n => n + 1);
    setTimeout(() => {
      nodeAnimsRef.current.delete(id);
      forceRender(n => n + 1);
    }, 200);
    setTimeout(() => {
      setSelectedNodeId(id);
      setEditingNodeIdLocal(id);
      setEditingText('中心主题');
      setEditingNode(id);
    }, 100);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    emitCursorMove(world.x, world.y);

    if (panning) {
      setOffset({
        x: panStart.offX + (e.clientX - panStart.x),
        y: panStart.offY + (e.clientY - panStart.y)
      });
      return;
    }

    if (draggingNodeId) {
      const dx = (e.clientX - dragStart.x) / scaleRef.current;
      const dy = (e.clientY - dragStart.y) / scaleRef.current;
      const newX = dragStart.nodeX + dx;
      const newY = dragStart.nodeY + dy;
      updateNode(draggingNodeId, { x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
    setPanning(false);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    const node = nodes.get(nodeId);
    if (!node) return;
    setSelectedNodeId(nodeId);
    const size = nodeSizes.get(nodeId) || { width: 100, height: 50 };
    setToolbarPos({
      x: offsetRef.current.x + (node.x + size.width) * scaleRef.current + 12,
      y: offsetRef.current.y + node.y * scaleRef.current
    });
    setShowToolbar(true);
    if (e.button === 0 && !e.altKey) {
      setDraggingNodeId(nodeId);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        nodeX: node.x,
        nodeY: node.y
      });
    }
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, node: NodeData) => {
    e.stopPropagation();
    if (readOnly) return;
    setEditingNodeIdLocal(node.id);
    setEditingText(node.text);
    setEditingNode(node.id);
  };

  const finishEditing = (save: boolean) => {
    if (editingNodeId && save) {
      updateNode(editingNodeId, { text: editingText });
    }
    setEditingNodeIdLocal(null);
    setEditingNode(null);
    setEditingText('');
  };

  const deleteSelectedNode = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
      setSelectedNodeId(null);
      setShowToolbar(false);
      setShowNotePanel(false);
    }
  };

  const exportPng = async () => {
    if (!canvasLayerRef.current) return;
    try {
      const rect = containerRef.current?.getBoundingClientRect();
      const nodeArr = Array.from(nodes.values());
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodeArr.forEach(n => {
        const s = nodeSizes.get(n.id) || { width: 100, height: 50 };
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + s.width);
        maxY = Math.max(maxY, n.y + s.height);
      });
      if (!isFinite(minX)) {
        alert('画布为空，无法导出');
        return;
      }
      const margin = 60;
      const prevScale = scale;
      const prevOffset = offset;
      setScale(1);
      setOffset({ x: -minX + margin, y: -minY + margin });
      await new Promise(r => setTimeout(r, 50));
      const width = (maxX - minX + margin * 2) * 2;
      const height = (maxY - minY + margin * 2) * 2;
      const dataUrl = await toPng(canvasLayerRef.current, {
        pixelRatio: 2,
        width: (maxX - minX + margin * 2),
        height: (maxY - minY + margin * 2),
        backgroundColor: '#F7F9FC'
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mindmap-${mindmapId.slice(0, 8)}.png`;
      a.click();
      setScale(prevScale);
      setOffset(prevOffset);
    } catch (e) {
      console.error('Export failed', e);
      alert('导出失败，请重试');
    }
  };

  const renderConnections = useMemo(() => {
    const conns: JSX.Element[] = [];
    nodes.forEach((node) => {
      if (!node.parent_id) return;
      const parent = nodes.get(node.parent_id);
      if (!parent) return;
      const ps = nodeSizes.get(node.parent_id) || { width: 100, height: 50 };
      const cs = nodeSizes.get(node.id) || { width: 100, height: 50 };
      const startX = parent.x + ps.width;
      const startY = parent.y + ps.height / 2;
      const endX = node.x;
      const endY = node.y + cs.height / 2;
      const ctrlX = (startX + endX) / 2;
      conns.push(
        <path
          key={`conn-${node.id}`}
          d={`M ${startX} ${startY} C ${ctrlX} ${startY}, ${ctrlX} ${endY}, ${endX} ${endY}`}
          stroke="#C8D1DB"
          strokeWidth={2}
          fill="none"
        />
      );
    });
    return conns;
  }, [nodes, nodeSizes]);

  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#F7F9FC',
        overflow: 'hidden',
        userSelect: 'none',
        cursor: panning ? 'grabbing' : 'default'
      }}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onDoubleClick={handleCanvasDoubleClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 64,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #E8ECF1',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #E0E6ED',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'box-shadow 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          ← 返回
        </button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <h2 style={{
            margin: 0, fontSize: 18, fontWeight: 600,
            color: '#1E293B', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'
          }}>
            {props.mindmap ? props.mindmap.title : '思维导图'}
            {readOnly && <span style={{ fontSize: 12, marginLeft: 10, color: '#94A3B8', fontWeight: 400 }}>（只读模式）</span>}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="toolbar-desktop">
          <button
            onClick={undo}
            disabled={!canUndo || readOnly}
            style={{
              padding: '10px 14px', borderRadius: 8, border: '1px solid #E0E6ED',
              background: '#fff', cursor: !canUndo || readOnly ? 'not-allowed' : 'pointer',
              fontSize: 14, opacity: !canUndo || readOnly ? 0.5 : 1,
              transition: 'box-shadow 0.15s'
            }}
            onMouseEnter={e => !canUndo || readOnly ? null : (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            title="撤销 (Ctrl+Z)"
          >↶ 撤销</button>
          <button
            onClick={redo}
            disabled={!canRedo || readOnly}
            style={{
              padding: '10px 14px', borderRadius: 8, border: '1px solid #E0E6ED',
              background: '#fff', cursor: !canRedo || readOnly ? 'not-allowed' : 'pointer',
              fontSize: 14, opacity: !canRedo || readOnly ? 0.5 : 1,
              transition: 'box-shadow 0.15s'
            }}
            onMouseEnter={e => !canRedo || readOnly ? null : (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            title="重做 (Ctrl+Shift+Z)"
          >↷ 重做</button>
          <button
            onClick={exportPng}
            style={{
              padding: '10px 14px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
              color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
              transition: 'box-shadow 0.15s, transform 0.1s'
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
          >⬇ 导出PNG</button>
          {!readOnly && (
            <button
              onClick={onShare}
              style={{
                padding: '10px 14px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #6BCB77, #4CAF50)',
                color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                transition: 'box-shadow 0.15s, transform 0.1s'
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >🔗 分享</button>
          )}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="toolbar-mobile-btn"
            style={{
              display: 'none',
              padding: '10px 14px', borderRadius: 8, border: '1px solid #E0E6ED',
              background: '#fff', cursor: 'pointer', fontSize: 18
            }}
          >☰</button>
        </div>
      </div>

      {showMobileMenu && (
        <div style={{
          position: 'fixed', top: 64, right: 16, zIndex: 101,
          background: '#fff', borderRadius: 8, border: '1px solid #E8ECF1',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: 8, display: 'flex', flexDirection: 'column', gap: 4
        }} className="toolbar-mobile-menu">
          <button onClick={() => { undo(); setShowMobileMenu(false); }}
            disabled={!canUndo || readOnly}
            style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}>↶ 撤销</button>
          <button onClick={() => { redo(); setShowMobileMenu(false); }}
            disabled={!canRedo || readOnly}
            style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}>↷ 重做</button>
          <button onClick={() => { exportPng(); setShowMobileMenu(false); }}
            style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}>⬇ 导出PNG</button>
          {!readOnly && <button onClick={() => { onShare(); setShowMobileMenu(false); }}
            style={{ padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}>🔗 分享</button>}
        </div>
      )}

      <div
        ref={canvasLayerRef}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          transformOrigin: '0 0',
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          width: 8000,
          height: 6000,
          pointerEvents: panning ? 'none' : 'auto',
          transition: draggingNodeId || panning ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <svg
          ref={svgRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: 8000, height: 6000,
            pointerEvents: 'none'
          }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E8ECF1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="8000" height="6000" fill="url(#grid)" />
          {renderConnections}
        </svg>

        {Array.from(nodes.entries()).map(([id, node]) => {
          const size = nodeSizes.get(id) || { width: 100, height: 50 };
          const isSelected = selectedNodeId === id;
          const isEditing = editingNodeId === id;
          const isAnim = nodeAnimsRef.current.has(id);
          const editingUsers = users.filter(u => u.editingNodeId === id && u.id !== currentUser?.id);
          const flashEditing = editingUsers.length > 0;
          const bgColor = node.bg_color || (LEVEL_COLORS[node.level] || LEVEL_COLORS[2]);
          return (
            <div
              key={id}
              onMouseDown={(e) => handleNodeMouseDown(e, id)}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                minWidth: NODE_MIN_WIDTH,
                minHeight: 32,
                padding: `${NODE_PADDING_Y}px ${NODE_PADDING_X}px`,
                background: bgColor,
                borderRadius: node.level === 0 ? '50%' : 8,
                boxShadow: isSelected
                  ? '0 4px 16px rgba(0,0,0,0.12), 0 0 0 2px #4A90D9'
                  : '0 2px 6px rgba(0,0,0,0.06)',
                border: `${node.border_width}px solid`,
                borderColor: isSelected ? '#4A90D9' : (
                  node.border_width > 1 ? '#4A5568' : 'rgba(0,0,0,0.08)'
                ),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontSize: NODE_FONT_SIZE,
                fontWeight: node.font_bold ? 700 : 400,
                color: '#1E293B',
                lineHeight: 1.5,
                cursor: readOnly ? 'default' : 'grab',
                transform: isAnim ? 'scale(0)' : 'scale(1)',
                transition: isAnim ? 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' : (draggingNodeId === id ? 'none' : 'box-shadow 0.15s, border-color 0.15s'),
                maxWidth: 200 + NODE_PADDING_X * 2,
                wordBreak: 'break-word',
                animation: flashEditing ? 'node-flash 0.8s ease-in-out infinite' : undefined,
                zIndex: isSelected ? 10 : 1
              }}
            >
              {isEditing ? (
                <textarea
                  autoFocus
                  value={editingText}
                  onChange={e => setEditingText(e.target.value)}
                  onBlur={() => finishEditing(true)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      finishEditing(true);
                    } else if (e.key === 'Escape') {
                      finishEditing(false);
                    }
                    e.stopPropagation();
                  }}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    textAlign: 'center',
                    fontSize: NODE_FONT_SIZE,
                    fontWeight: node.font_bold ? 700 : 400,
                    color: '#1E293B',
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                    width: Math.max(NODE_MIN_WIDTH - NODE_PADDING_X * 2, measureTextWidth(editingText, node.font_bold === 1)),
                    minHeight: NODE_FONT_SIZE * 1.5,
                    padding: 0,
                    margin: 0,
                    overflow: 'hidden'
                  }}
                />
              ) : (
                <span style={{ pointerEvents: 'none' }}>{node.text || ' '}</span>
              )}
              {!isEditing && node.note && (
                <div style={{
                  position: 'absolute',
                  bottom: -6, right: -6,
                  width: 18, height: 18,
                  background: '#F59E0B',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  fontWeight: 700
                }}>✎</div>
              )}
            </div>
          );
        })}
      </div>

      {showToolbar && selectedNode && !readOnly && (
        <div
          style={{
            position: 'fixed',
            top: Math.max(70, toolbarPos.y),
            left: toolbarPos.x,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            padding: 16,
            zIndex: 50,
            width: 240,
            border: '1px solid #E8ECF1'
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1E293B' }}>节点样式</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>背景颜色</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {COLOR_PALETTE.map((c, i) => (
                <button
                  key={i}
                  onClick={() => updateNode(selectedNodeId!, { bg_color: selectedNode.bg_color === c ? null : c })}
                  style={{
                    width: 36, height: 36,
                    borderRadius: 8,
                    border: selectedNode.bg_color === c ? '2px solid #4A90D9' : '2px solid transparent',
                    background: c,
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>边框粗细</span><span>{selectedNode.border_width}px</span>
            </div>
            <input
              type="range"
              min={1} max={4} step={1}
              value={selectedNode.border_width}
              onChange={e => updateNode(selectedNodeId!, { border_width: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={() => updateNode(selectedNodeId!, { font_bold: selectedNode.font_bold ? 0 : 1 })}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: selectedNode.font_bold ? '2px solid #4A90D9' : '1px solid #E0E6ED',
                background: selectedNode.font_bold ? 'rgba(74,144,217,0.1)' : '#fff',
                cursor: 'pointer',
                fontWeight: selectedNode.font_bold ? 700 : 400,
                fontSize: 13,
                color: '#1E293B',
                width: '100%'
              }}
            >
              <strong>B</strong> 字体加粗
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              onClick={() => {
                setShowNotePanel(true);
                setNoteText(selectedNode.note || '');
              }}
              style={{
                flex: 1, padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #E0E6ED',
                background: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                color: '#1E293B'
              }}
            >✎ {selectedNode.note ? '编辑备注' : '添加备注'}</button>
            <button
              onClick={deleteSelectedNode}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #FECACA',
                background: '#FEF2F2',
                cursor: 'pointer',
                fontSize: 13,
                color: '#DC2626',
                fontWeight: 500
              }}
            >🗑</button>
          </div>
          <button
            onClick={() => {
              const parent = nodes.get(selectedNode.parent_id || '');
              const siblings = Array.from(nodes.values()).filter(n => n.parent_id === selectedNodeId);
              const size = nodeSizes.get(selectedNodeId!) || { width: 100, height: 50 };
              const id = uuidv4();
              createNode({
                id,
                mindmap_id: mindmapId,
                parent_id: selectedNodeId,
                text: '新想法',
                x: selectedNode.x + size.width + 100,
                y: selectedNode.y + siblings.length * 70,
                level: selectedNode.level + 1,
                bg_color: null,
                border_width: 1,
                font_bold: 0,
                note: null
              });
              nodeAnimsRef.current.add(id);
              forceRender(n => n + 1);
              setTimeout(() => { nodeAnimsRef.current.delete(id); forceRender(n => n + 1); }, 200);
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500
            }}
          >＋ 添加子节点 (Tab)</button>
        </div>
      )}

      {showNotePanel && selectedNodeId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.4)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowNotePanel(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              width: 420,
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>节点备注</h3>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="输入备注内容..."
              style={{
                width: '100%',
                minHeight: 160,
                padding: 12,
                borderRadius: 8,
                border: '1px solid #E0E6ED',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#4A90D9'}
              onBlur={e => e.currentTarget.style.borderColor = '#E0E6ED'}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNotePanel(false)}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E0E6ED', background: '#fff', cursor: 'pointer', fontSize: 14 }}
              >取消</button>
              <button
                onClick={() => { updateNode(selectedNodeId!, { note: noteText || null }); setShowNotePanel(false); }}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
                  color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500
                }}
              >保存</button>
            </div>
          </div>
        </div>
      )}

      <svg
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          pointerEvents: 'none',
          zIndex: 60
        }}
      >
        {users.filter(u => u.id !== currentUser?.id).map(user => (
          <g key={user.id}>
            <circle
              cx={offset.x + user.x * scale}
              cy={offset.y + user.y * scale}
              r={8}
              fill={user.color}
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}
            />
            <circle
              cx={offset.x + user.x * scale}
              cy={offset.y + user.y * scale}
              r={3}
              fill="#fff"
            />
            <g transform={`translate(${offset.x + user.x * scale + 12}, ${offset.y + user.y * scale - 6})`}>
              <rect
                x="0" y="0"
                rx="4" ry="4"
                width={user.name.length * 12 + 16}
                height={22}
                fill={user.color}
                opacity={0.95}
              />
              <text x="8" y="15" fontSize="12" fill="#fff" fontWeight="600" style={{ fontFamily: 'sans-serif' }}>{user.name}</text>
            </g>
          </g>
        ))}
      </svg>

      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        padding: '10px 20px',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #E8ECF1',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 90,
        fontSize: 13
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748B' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: users.length > 0 ? '#22C55E' : '#94A3B8' }}></span>
            在线 <strong style={{ color: '#1E293B' }}>{users.length}</strong> 人
          </span>
          <span style={{ display: 'flex', gap: 6 }}>
            {users.map(u => (
              <span key={u.id} title={u.name} style={{
                width: 20, height: 20, borderRadius: '50%',
                background: u.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', fontWeight: 600,
                border: u.id === currentUser?.id ? '2px solid #4A90D9' : 'none'
              }}>{u.name[0]}</span>
            ))}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748B' }}>
          <span>缩放: <strong style={{ color: '#1E293B' }}>{Math.round(scale * 100)}%</strong></span>
          <button onClick={() => setScale(1)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #E0E6ED', background: '#fff', cursor: 'pointer', fontSize: 12 }}>复位</button>
          <span style={{ fontSize: 12 }}>滚轮缩放 · Alt+拖拽平移</span>
        </div>
      </div>

      <style>{`
        @keyframes node-flash {
          0%, 100% { box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
          50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4), 0 2px 6px rgba(0,0,0,0.06); }
        }
        @media (max-width: 768px) {
          .toolbar-desktop > button:not(.toolbar-mobile-btn) {
            display: none !important;
          }
          .toolbar-mobile-btn {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .toolbar-mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
