import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Line, Transformer } from 'react-konva';
import { MindmapNode } from '../socket';
import Konva from 'konva';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 50;
const COLORS = ['#e94560', '#4ade80', '#60a5fa', '#fbbf24', '#a78bfa', '#fb7185'];

interface MindmapProps {
  nodes: Record<string, MindmapNode>;
  userId: string;
  onNodeCreate: (node: MindmapNode) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<MindmapNode>) => void;
  onNodeDelete: (nodeId: string) => void;
  onNodesMerge: (nodeIds: string[], primaryNodeId: string, newText: string) => void;
  onCreateTask: (nodeId: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}

const Mindmap: React.FC<MindmapProps> = ({
  nodes,
  userId,
  onNodeCreate,
  onNodeUpdate,
  onNodeDelete,
  onNodesMerge,
  onCreateTask,
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null,
  });
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [flashingEdges, setFlashingEdges] = useState<Set<string>>(new Set());
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const nodesArray = useMemo(() => Object.values(nodes), [nodes]);

  const edges = useMemo(() => {
    return nodesArray
      .filter(node => node.parent_id && nodes[node.parent_id])
      .map(node => ({
        id: `${node.parent_id}-${node.id}`,
        from: node.parent_id!,
        to: node.id,
        fromNode: nodes[node.parent_id!],
        toNode: node,
      }));
  }, [nodesArray, nodes]);

  const generateNodeId = () => 'node_' + Math.random().toString(36).substring(2, 10);

  const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

  const handleStageDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const x = (pos.x - position.x) / scale;
      const y = (pos.y - position.y) / scale;

      const newNode: MindmapNode = {
        id: generateNodeId(),
        parent_id: null,
        text: '新节点',
        color: getRandomColor(),
        x,
        y,
        creator_id: userId,
      };

      onNodeCreate(newNode);
      setEditingNode(newNode.id);
      setEditingText('新节点');
    }
  }, [position, scale, userId, onNodeCreate]);

  const handleNodeClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>, nodeId: string) => {
    e.cancelBubble = true;

    if (e.evt.shiftKey) {
      setSelectedNodes(prev =>
        prev.includes(nodeId)
          ? prev.filter(id => id !== nodeId)
          : [...prev, nodeId]
      );
    } else {
      setSelectedNodes([nodeId]);
    }
  }, []);

  const handleStageClick = useCallback(() => {
    if (!isDraggingStage) {
      setSelectedNodes([]);
    }
  }, [isDraggingStage]);

  const handleNodeContextMenu = useCallback((e: Konva.KonvaEventObject<MouseEvent>, nodeId: string) => {
    e.evt.preventDefault();
    e.cancelBubble = true;
    setContextMenu({
      visible: true,
      x: e.evt.clientX,
      y: e.evt.clientY,
      nodeId,
    });
  }, []);

  const handleNodeDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>, nodeId: string) => {
    e.cancelBubble = true;
    if (!selectedNodes.includes(nodeId)) {
      setSelectedNodes([nodeId]);
    }
  }, [selectedNodes]);

  const handleNodeDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const node = e.target;
    const nodeId = node.name();
    if (!nodeId) return;

    const updates = {
      x: node.x(),
      y: node.y(),
    };

    onNodeUpdate(nodeId, updates);

    if (selectedNodes.length > 1 && selectedNodes.includes(nodeId)) {
      const lastPos = (e.target as any)._lastPos || { x: e.target.x(), y: e.target.y() };
      const dx = e.target.x() - lastPos.x;
      const dy = e.target.y() - lastPos.y;

      selectedNodes.forEach(id => {
        if (id !== nodeId && nodes[id]) {
          const currentX = nodes[id].x;
          const currentY = nodes[id].y;
          onNodeUpdate(id, { x: currentX + dx, y: currentY + dy });
        }
      });
    }

    (e.target as any)._lastPos = { x: e.target.x(), y: e.target.y() };
  }, [selectedNodes, nodes, onNodeUpdate]);

  const handleNodeDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
  }, []);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage() && e.evt.button === 0) {
      setIsDraggingStage(true);
      dragStartPos.current = {
        x: e.evt.clientX - position.x,
        y: e.evt.clientY - position.y,
      };
    }
  }, [position]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isDraggingStage) {
      setPosition({
        x: e.evt.clientX - dragStartPos.current.x,
        y: e.evt.clientY - dragStartPos.current.y,
      });
    }
  }, [isDraggingStage]);

  const handleStageMouseUp = useCallback(() => {
    setTimeout(() => setIsDraggingStage(false), 0);
  }, []);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, oldScale * delta));

    setScale(newScale);
    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, [scale, position]);

  const handleTextDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>, node: MindmapNode) => {
    e.cancelBubble = true;
    setEditingNode(node.id);
    setEditingText(node.text);
  }, []);

  const handleTextSubmit = useCallback((nodeId: string) => {
    if (editingText.trim()) {
      onNodeUpdate(nodeId, { text: editingText.trim() });
    }
    setEditingNode(null);
    setEditingText('');
  }, [editingText, onNodeUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingNode) {
        handleTextSubmit(editingNode);
      }
    } else if (e.key === 'Escape') {
      setEditingNode(null);
      setEditingText('');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!editingNode && selectedNodes.length > 0) {
        e.preventDefault();
        selectedNodes.forEach(id => onNodeDelete(id));
        setSelectedNodes([]);
      }
    }
  }, [editingNode, selectedNodes, handleTextSubmit, onNodeDelete]);

  const handleCreateChildNode = useCallback(() => {
    if (!contextMenu.nodeId || !nodes[contextMenu.nodeId]) return;

    const parent = nodes[contextMenu.nodeId];
    const childNode: MindmapNode = {
      id: generateNodeId(),
      parent_id: parent.id,
      text: '子节点',
      color: getRandomColor(),
      x: parent.x + 200,
      y: parent.y,
      creator_id: userId,
    };

    onNodeCreate(childNode);
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
    setEditingNode(childNode.id);
    setEditingText('子节点');
  }, [contextMenu.nodeId, nodes, userId, onNodeCreate]);

  const handleConvertToTask = useCallback(() => {
    if (!contextMenu.nodeId) return;
    onCreateTask(contextMenu.nodeId);
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });

    setNewTaskIds(prev => {
      const next = new Set(prev);
      next.add(contextMenu.nodeId!);
      return next;
    });
    setTimeout(() => {
      setNewTaskIds(prev => {
        const next = new Set(prev);
        next.delete(contextMenu.nodeId!);
        return next;
      });
    }, 1000);
  }, [contextMenu.nodeId, onCreateTask]);

  const handleDeleteNode = useCallback(() => {
    if (!contextMenu.nodeId) return;
    onNodeDelete(contextMenu.nodeId);
    setSelectedNodes(prev => prev.filter(id => id !== contextMenu.nodeId));
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  }, [contextMenu.nodeId, onNodeDelete]);

  const handleMergeNodes = useCallback(() => {
    if (selectedNodes.length < 2) return;

    const edgeIds = new Set<string>();
    for (let i = 0; i < selectedNodes.length - 1; i++) {
      for (let j = i + 1; j < selectedNodes.length; j++) {
        edgeIds.add(`${selectedNodes[i]}-${selectedNodes[j]}`);
        edgeIds.add(`${selectedNodes[j]}-${selectedNodes[i]}`);
      }
    }
    setFlashingEdges(edgeIds);

    setTimeout(() => {
      const primaryNodeId = selectedNodes[0];
      const mergedText = selectedNodes
        .map(id => nodes[id]?.text || '')
        .filter(Boolean)
        .join(' + ');

      onNodesMerge(selectedNodes, primaryNodeId, mergedText);
      setSelectedNodes([primaryNodeId]);
      setFlashingEdges(new Set());
    }, 600);
  }, [selectedNodes, nodes, onNodesMerge]);

  const handleAddChildToSelected = useCallback(() => {
    if (selectedNodes.length !== 1) return;

    const parent = nodes[selectedNodes[0]];
    if (!parent) return;

    const childNode: MindmapNode = {
      id: generateNodeId(),
      parent_id: parent.id,
      text: '子节点',
      color: getRandomColor(),
      x: parent.x + 200,
      y: parent.y + (Object.values(nodes).filter(n => n.parent_id === parent.id).length) * 70,
      creator_id: userId,
    };

    onNodeCreate(childNode);
    setEditingNode(childNode.id);
    setEditingText('子节点');
  }, [selectedNodes, nodes, userId, onNodeCreate]);

  const handleConvertAllToTasks = useCallback(() => {
    selectedNodes.forEach(nodeId => onCreateTask(nodeId));
    setSelectedNodes([]);
  }, [selectedNodes, onCreateTask]);

  const handleZoomIn = () => {
    setScale(s => Math.min(3, s * 1.2));
  };

  const handleZoomOut = () => {
    setScale(s => Math.max(0.3, s / 1.2));
  };

  const handleResetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const getBezierPath = (fromNode: MindmapNode, toNode: MindmapNode) => {
    const x1 = fromNode.x + NODE_WIDTH;
    const y1 = fromNode.y + NODE_HEIGHT / 2;
    const x2 = toNode.x;
    const y2 = toNode.y + NODE_HEIGHT / 2;

    const dx = Math.abs(x2 - x1);
    const controlOffset = dx * 0.5;

    return [
      x1, y1,
      x1 + controlOffset, y1,
      x2 - controlOffset, y2,
      x2, y2,
    ];
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onDblClick={handleStageDblClick}
        onClick={handleStageClick}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
      >
        <Layer>
          {edges.map(edge => (
            <Line
              key={edge.id}
              points={getBezierPath(edge.fromNode, edge.toNode)}
              stroke={flashingEdges.has(edge.id) ? '#e94560' : '#4a5568'}
              strokeWidth={flashingEdges.has(edge.id) ? 4 : 2}
              tension={0.5}
              lineCap="round"
              dash={flashingEdges.has(edge.id) ? [10, 5] : undefined}
            />
          ))}

          {nodesArray.map(node => {
            const isSelected = selectedNodes.includes(node.id);
            const isEditing = editingNode === node.id;
            const isNewTask = newTaskIds.has(node.id);

            return (
              <React.Fragment key={node.id}>
                <Rect
                  name={node.id}
                  x={node.x}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  fill="#16213e"
                  stroke={isSelected ? '#e94560' : node.color}
                  strokeWidth={isSelected ? 3 : 2}
                  cornerRadius={4}
                  draggable
                  shadowColor="rgba(233,69,96,0.3)"
                  shadowBlur={isSelected ? 16 : 8}
                  shadowOpacity={isSelected ? 0.6 : 0.3}
                  onClick={(e) => handleNodeClick(e, node.id)}
                  onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
                  onDragStart={(e) => handleNodeDragStart(e, node.id)}
                  onDragMove={handleNodeDragMove}
                  onDragEnd={handleNodeDragEnd}
                  onDblClick={(e) => {
                    e.cancelBubble = true;
                    setEditingNode(node.id);
                    setEditingText(node.text);
                  }}
                />

                {isEditing ? (
                  <Text
                    x={node.x + 10}
                    y={node.y + 15}
                    width={NODE_WIDTH - 20}
                    text={editingText + '|'}
                    fontSize={14}
                    fill="#ffffff"
                    align="center"
                  />
                ) : (
                  <Text
                    x={node.x + 10}
                    y={node.y + 15}
                    width={NODE_WIDTH - 20}
                    text={node.text}
                    fontSize={14}
                    fill="#e2e8f0"
                    align="center"
                    ellipsis={true}
                    onDblClick={(e) => handleTextDblClick(e, node)}
                  />
                )}

                {isNewTask && (
                  <Rect
                    x={node.x - 3}
                    y={node.y - 3}
                    width={NODE_WIDTH + 6}
                    height={NODE_HEIGHT + 6}
                    stroke="#4ade80"
                    strokeWidth={3}
                    cornerRadius={6}
                    opacity={0}
                  />
                )}
              </React.Fragment>
            );
          })}
        </Layer>
      </Stage>

      {selectedNodes.length > 0 && (
        <div className="batch-toolbar">
          <span>已选择 {selectedNodes.length} 个节点</span>
          {selectedNodes.length >= 2 && (
            <button onClick={handleMergeNodes}>🔗 合并节点</button>
          )}
          {selectedNodes.length === 1 && (
            <button onClick={handleAddChildToSelected}>➕ 添加子节点</button>
          )}
          <button onClick={handleConvertAllToTasks}>📋 全部转为任务</button>
          <button onClick={() => setSelectedNodes([])}>✕ 取消选择</button>
        </div>
      )}

      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleCreateChildNode}>
            ➕ 创建子节点
          </div>
          <div className="context-menu-item" onClick={handleConvertToTask}>
            📋 转为任务
          </div>
          <div className="context-menu-item danger" onClick={handleDeleteNode}>
            🗑️ 删除节点
          </div>
        </div>
      )}

      <div className="zoom-controls">
        <button onClick={handleZoomIn}>+</button>
        <button onClick={handleZoomOut}>−</button>
        <button onClick={handleResetView}>⟲</button>
      </div>

      <div className="instructions">
        <div><strong>双击画布</strong> 创建新节点</div>
        <div><strong>Shift + 点击</strong> 多选节点</div>
        <div><strong>右键节点</strong> 查看更多操作</div>
        <div><strong>滚轮</strong> 缩放 · <strong>拖拽画布</strong> 平移</div>
      </div>

      {editingNode && nodes[editingNode] && (
        <input
          type="text"
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={() => handleTextSubmit(editingNode)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleTextSubmit(editingNode);
            } else if (e.key === 'Escape') {
              setEditingNode(null);
              setEditingText('');
            }
          }}
          autoFocus
          style={{
            position: 'fixed',
            left: -9999,
            top: -9999,
          }}
        />
      )}
    </div>
  );
};

export default Mindmap;
