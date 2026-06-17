import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { Node } from './Node';
import { Connections } from './Connections';
import { MindMapNode, MIN_SCALE, MAX_SCALE } from '../types';

interface CanvasProps {
  nodes: Record<string, MindMapNode>;
  rootIds: string[];
  selectedNodeId: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
  onSelectNode: (id: string | null) => void;
  onAddRootNode: (x: number, y: number) => void;
  onAddChildNode: (parentId: string) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onUpdateNodeText: (id: string, text: string) => void;
  onDeleteNode: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onSetScale: (scale: number) => void;
  onSetOffset: (x: number, y: number) => void;
  newNodeId: string | null;
  onCommitNodePosition: (id: string, x: number, y: number) => void;
  canvasRef?: React.RefObject<HTMLDivElement>;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  rootIds,
  selectedNodeId,
  scale,
  offsetX,
  offsetY,
  onSelectNode,
  onAddRootNode,
  onAddChildNode,
  onUpdateNodePosition,
  onUpdateNodeText,
  onDeleteNode,
  onToggleCollapse,
  onSetScale,
  onSetOffset,
  newNodeId,
  onCommitNodePosition,
  canvasRef: externalCanvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerCanvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [newNodes, setNewNodes] = useState<Set<string>>(new Set());

  const [, drop] = useDrop(() => ({
    accept: 'NODE',
    drop: () => ({ name: 'Canvas' }),
  }), []);

  const canvasRef = externalCanvasRef || innerCanvasRef;

  const visibleNodes = useMemo(() => {
    const visible: MindMapNode[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = nodes[nodeId];
      if (!node) return;
      visible.push(node);
      if (!node.collapsed) {
        node.children.forEach(traverse);
      }
    };

    rootIds.forEach(traverse);
    return visible;
  }, [nodes, rootIds]);

  useEffect(() => {
    if (newNodeId) {
      setNewNodes((prev) => {
        const next = new Set(prev);
        next.add(newNodeId);
        return next;
      });
      const timer = setTimeout(() => {
        setNewNodes((prev) => {
          const next = new Set(prev);
          next.delete(newNodeId);
          return next;
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [newNodeId]);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      const x = (screenX - rect.left - offsetX) / scale;
      const y = (screenY - rect.top - offsetY) / scale;
      return { x, y };
    },
    [offsetX, offsetY, scale]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget && e.target !== canvasRef.current) {
        return;
      }
      if (draggingNodeId) return;

      onSelectNode(null);

      if (visibleNodes.length === 0 && e.button === 0) {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        onAddRootNode(x, y);
      }
    },
    [onSelectNode, onAddRootNode, screenToCanvas, visibleNodes.length, draggingNodeId, canvasRef]
  );

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget && e.target !== canvasRef.current) {
        return;
      }
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      onAddRootNode(x, y);
    },
    [onAddRootNode, screenToCanvas, canvasRef]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));

      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleRatio = newScale / scale;
        const newOffsetX = mouseX - (mouseX - offsetX) * scaleRatio;
        const newOffsetY = mouseY - (mouseY - offsetY) * scaleRatio;

        onSetScale(newScale);
        onSetOffset(newOffsetX, newOffsetY);
      } else {
        onSetScale(newScale);
      }
    },
    [scale, offsetX, offsetY, onSetScale, onSetOffset]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY, offsetX, offsetY });
      }
    },
    [offsetX, offsetY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        onSetOffset(panStart.offsetX + dx, panStart.offsetY + dy);
      }

      if (draggingNodeId) {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        onUpdateNodePosition(draggingNodeId, x - dragOffset.x, y - dragOffset.y);
      }
    },
    [isPanning, panStart, onSetOffset, draggingNodeId, dragOffset, screenToCanvas, onUpdateNodePosition]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (draggingNodeId) {
      const node = nodes[draggingNodeId];
      if (node) {
        onCommitNodePosition(draggingNodeId, node.x, node.y);
      }
      setDraggingNodeId(null);
    }
  }, [isPanning, draggingNodeId, nodes, onCommitNodePosition]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const node = nodes[nodeId];
      if (!node) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      setDragOffset({ x: x - node.x, y: y - node.y });
      setDraggingNodeId(nodeId);
      onSelectNode(nodeId);
    },
    [nodes, screenToCanvas, onSelectNode]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && selectedNodeId) {
        e.preventDefault();
        onAddChildNode(selectedNodeId);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          onDeleteNode(selectedNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, onAddChildNode, onDeleteNode]);

  const canvasStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
    transformOrigin: '0 0',
    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#282840',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
      }}
      onClick={handleCanvasClick}
      onDoubleClick={handleCanvasDoubleClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      <div
        ref={(el) => {
          drop(el);
          if (el && innerCanvasRef.current !== el) {
            (innerCanvasRef as React.MutableRefObject<HTMLDivElement>).current = el;
          }
        }}
        style={canvasStyle}
      >
        <Connections nodes={visibleNodes} nodesMap={nodes} />

        {visibleNodes.map((node) => (
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            style={{ position: 'absolute' }}
          >
            <Node
              node={node}
              isSelected={selectedNodeId === node.id}
              onSelect={onSelectNode}
              onUpdateText={onUpdateNodeText}
              onDelete={onDeleteNode}
              onToggleCollapse={onToggleCollapse}
              scale={scale}
              isNew={newNodes.has(node.id)}
              isDragging={draggingNodeId === node.id}
            />
          </div>
        ))}
      </div>

      {visibleNodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '18px',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
          <div>双击画布添加想法</div>
          <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}>
            右键拖拽平移 · 滚轮缩放 · Tab添加子节点
          </div>
        </div>
      )}
    </div>
  );
};
