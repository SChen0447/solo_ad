import { FC, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect as KonvaRect } from 'react-konva';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';
import { MindMapNode, NODE_WIDTH } from './types';
import NodeItem from './components/NodeItem';
import EdgeLine from './components/EdgeLine';
import {
  layoutNodes,
  calculateEdges,
  calculateNodeHeight,
  getDescendants,
  getVisibleNodes,
  updateNodePositionWithChildren,
} from './utils/drawGraph';

const createInitialNodes = (): Record<string, MindMapNode> => {
  const rootId = uuidv4();
  const childId = uuidv4();

  const nodes: Record<string, MindMapNode> = {};

  nodes[rootId] = {
    id: rootId,
    text: '项目规划',
    parentId: null,
    children: [childId],
    x: 0,
    y: 0,
    width: NODE_WIDTH,
    height: 44,
    collapsed: false,
    level: 0,
  };

  nodes[childId] = {
    id: childId,
    text: '需求分析',
    parentId: rootId,
    children: [],
    x: 0,
    y: 0,
    width: NODE_WIDTH,
    height: 44,
    collapsed: false,
    level: 1,
  };

  return nodes;
};

const App: FC = () => {
  const [nodes, setNodes] = useState<Record<string, MindMapNode>>(() => createInitialNodes());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 1200, height: 800 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const isFirstLayoutRef = useRef(true);

  const rootId = useMemo(() => {
    return Object.values(nodes).find((n) => n.parentId === null)?.id || '';
  }, [nodes]);

  const nodesWithHeights = useMemo(() => {
    const result: Record<string, number> = {};
    for (const node of Object.values(nodes)) {
      result[node.id] = calculateNodeHeight(node.text, node.width || NODE_WIDTH);
    }
    return result;
  }, [nodes]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const runLayout = useCallback(
    (currentNodes: Record<string, MindMapNode>, currentRootId: string) => {
      if (!currentRootId) return currentNodes;

      let startX = 100;
      let startY = stageSize.height / 2;

      if (!isFirstLayoutRef.current && currentNodes[currentRootId]) {
        startX = currentNodes[currentRootId].x;
        startY = currentNodes[currentRootId].y;
      }
      isFirstLayoutRef.current = false;

      const positions = layoutNodes(currentNodes, currentRootId, startX, startY);
      setNodePositions(positions);

      const newNodes = { ...currentNodes };
      for (const [id, pos] of Object.entries(positions)) {
        if (newNodes[id]) {
          newNodes[id] = {
            ...newNodes[id],
            x: pos.x,
            y: pos.y,
          };
        }
      }
      return newNodes;
    },
    [stageSize]
  );

  useEffect(() => {
    if (rootId && !draggingId) {
      setNodes((prev) => runLayout(prev, rootId));
    }
  }, [rootId, draggingId, runLayout]);

  const edges = useMemo(() => {
    return calculateEdges(nodes, nodePositions, nodesWithHeights);
  }, [nodes, nodePositions, nodesWithHeights]);

  const visibleNodeIds = useMemo(() => {
    return getVisibleNodes(nodes);
  }, [nodes]);

  const addChildNode = useCallback(
    (parentId: string) => {
      setNodes((prev) => {
        const newId = uuidv4();
        const parent = prev[parentId];
        if (!parent) return prev;

        const newLevel = parent.level + 1;
        const newNode: MindMapNode = {
          id: newId,
          text: '新节点',
          parentId,
          children: [],
          x: 0,
          y: 0,
          width: NODE_WIDTH,
          height: 44,
          collapsed: false,
          level: newLevel,
        };

        const newNodes = {
          ...prev,
          [newId]: newNode,
          [parentId]: {
            ...parent,
            children: [...parent.children, newId],
            collapsed: false,
          },
        };

        setSelectedId(newId);
        setEditingId(newId);

        const updated = runLayout(newNodes, rootId);
        return updated;
      });
    },
    [rootId, runLayout]
  );

  const addSiblingNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => {
        const node = prev[nodeId];
        if (!node || !node.parentId) return prev;

        const parent = prev[node.parentId];
        if (!parent) return prev;

        const newId = uuidv4();
        const newNode: MindMapNode = {
          id: newId,
          text: '新节点',
          parentId: node.parentId,
          children: [],
          x: 0,
          y: 0,
          width: NODE_WIDTH,
          height: 44,
          collapsed: false,
          level: parent.level + 1,
        };

        const siblingIndex = parent.children.indexOf(nodeId);
        const newChildren = [...parent.children];
        newChildren.splice(siblingIndex + 1, 0, newId);

        const newNodes = {
          ...prev,
          [newId]: newNode,
          [node.parentId]: {
            ...parent,
            children: newChildren,
          },
        };

        setSelectedId(newId);
        setEditingId(newId);

        return runLayout(newNodes, rootId);
      });
    },
    [rootId, runLayout]
  );

  const handleSelectNode = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleEditStart = useCallback((id: string) => {
    setEditingId(id);
    setSelectedId(id);
  }, []);

  const handleEditEnd = useCallback((id: string, newText: string) => {
    setEditingId((current) => {
      if (current === id) {
        setNodes((prev) => {
          if (!prev[id]) return prev;
          return {
            ...prev,
            [id]: {
              ...prev[id],
              text: newText,
            },
          };
        });
        return null;
      }
      return current;
    });
  }, []);

  const handleToggleCollapse = useCallback((id: string) => {
    setNodes((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          collapsed: !prev[id].collapsed,
        },
      };
    });
  }, []);

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
    setSelectedId(id);
  }, []);

  const handleDragMove = useCallback(
    (id: string, deltaX: number, deltaY: number) => {
      if (deltaX === 0 && deltaY === 0) return;
      setNodes((prev) => updateNodePositionWithChildren(id, deltaX, deltaY, prev));
      setNodePositions((prev) => {
        const descendants = getDescendants(id, nodes);
        const allAffected = [id, ...descendants];
        const newPositions = { ...prev };
        for (const nid of allAffected) {
          if (newPositions[nid]) {
            newPositions[nid] = {
              x: newPositions[nid].x + deltaX,
              y: newPositions[nid].y + deltaY,
            };
          }
        }
        return newPositions;
      });
    },
    [nodes]
  );

  const handleDragEnd = useCallback((_id: string) => {
    setDraggingId(null);
  }, []);

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => {
        const node = prev[id];
        if (!node || !node.parentId) return prev;

        const descendants = getDescendants(id, prev);
        const toDelete = new Set([id, ...descendants]);

        const newNodes: Record<string, MindMapNode> = {};
        for (const [nid, n] of Object.entries(prev)) {
          if (toDelete.has(nid)) continue;
          if (n.id === node.parentId) {
            newNodes[nid] = {
              ...n,
              children: n.children.filter((c) => c !== id),
            };
          } else {
            newNodes[nid] = n;
          }
        }

        setSelectedId(null);
        return runLayout(newNodes, rootId);
      });
    },
    [rootId, runLayout]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (selectedId) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addChildNode(selectedId);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          addSiblingNode(selectedId);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteNode(selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, editingId, addChildNode, addSiblingNode, deleteNode]);

  const handleExport = useCallback(async () => {
    if (!stageRef.current) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const padding = 50;

    for (const id of visibleNodeIds) {
      const pos = nodePositions[id] || { x: nodes[id].x, y: nodes[id].y };
      const h = nodesWithHeights[id] || 44;
      const w = NODE_WIDTH;
      minX = Math.min(minX, pos.x - 30);
      minY = Math.min(minY, pos.y - 10);
      maxX = Math.max(maxX, pos.x + w + 10);
      maxY = Math.max(maxY, pos.y + h + 10);
    }

    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 1000;
      maxY = 800;
    }

    const exportWidth = Math.ceil(maxX - minX + padding * 2);
    const exportHeight = Math.ceil(maxY - minY + padding * 2);

    const exportStage = new Konva.Stage({
      container: document.createElement('div'),
      width: exportWidth,
      height: exportHeight,
    });

    const bgLayer = new Konva.Layer();
    bgLayer.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width: exportWidth,
        height: exportHeight,
        fill: 'white',
      })
    );
    exportStage.add(bgLayer);

    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    const edgeLayer = new Konva.Layer();
    for (const edge of edges) {
      const shiftedPoints = edge.points.map((p, i) => (i % 2 === 0 ? p + offsetX : p + offsetY));
      edgeLayer.add(
        new Konva.Line({
          points: shiftedPoints,
          stroke: '#90a4ae',
          strokeWidth: 2,
          lineCap: 'round',
          lineJoin: 'round',
        })
      );
    }
    exportStage.add(edgeLayer);

    const nodeLayer = new Konva.Layer();
    for (const id of visibleNodeIds) {
      const node = nodes[id];
      const pos = nodePositions[id] || { x: node.x, y: node.y };
      const h = nodesWithHeights[id] || 44;
      const x = pos.x + offsetX;
      const y = pos.y + offsetY;
      const colorIndex = node.level % 6;
      const palette = ['#e3f2fd', '#fce4ec', '#e8f5e9', '#fff3e0', '#f3e5f5', '#e0f7fa'];

      const group = new Konva.Group({ x, y });
      group.add(
        new Konva.Rect({
          width: NODE_WIDTH,
          height: h,
          cornerRadius: 8,
          fill: palette[colorIndex],
          stroke: selectedId === id ? '#1976d2' : 'transparent',
          strokeWidth: selectedId === id ? 2 : 0,
        })
      );
      group.add(
        new Konva.Text({
          x: 12,
          y: 12,
          width: NODE_WIDTH - 24,
          height: h - 24,
          text: node.text,
          fontSize: 14,
          fontFamily: 'sans-serif',
          fill: '#333',
          align: 'center',
          verticalAlign: 'middle',
          wrap: 'word',
        })
      );
      nodeLayer.add(group);
    }
    exportStage.add(nodeLayer);

    try {
      const dataUrl = exportStage.toDataURL({ pixelRatio: 2 });
      const blob = await (async () => {
        const res = await fetch(dataUrl);
        return res.blob();
      })();
      saveAs(blob, `思维导图_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.png`);
    } catch (error) {
      console.error('导出失败:', error);
    }

    exportStage.destroy();
  }, [nodes, nodePositions, visibleNodeIds, edges, nodesWithHeights, selectedId]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  }, []);

  return (
    <div className="mind-map-container" ref={containerRef}>
      <div className="hint-bar">
        <span><strong>Enter</strong> 创建子节点</span>
        <span><strong>Tab</strong> 创建同级节点</span>
        <span><strong>Del</strong> 删除节点</span>
        <span><strong>双击</strong> 编辑文本</span>
      </div>
      <div className="toolbar">
        <button className="export-btn" onClick={handleExport}>
          导出 PNG
        </button>
      </div>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{ backgroundColor: '#f5f5f5' }}
      >
        <Layer>
          <KonvaRect
            x={0}
            y={0}
            width={stageSize.width}
            height={stageSize.height}
            fill="#f5f5f5"
            listening={false}
          />
        </Layer>
        <Layer>
          {edges.map((edge) => (
            <EdgeLine key={edge.id} points={edge.points} />
          ))}
        </Layer>
        <Layer>
          {visibleNodeIds.map((id) => {
            const node = nodes[id];
            if (!node) return null;
            const pos = nodePositions[id] || { x: node.x || 100, y: node.y || 300 };
            return (
              <NodeItem
                key={id}
                node={node}
                x={pos.x}
                y={pos.y}
                isSelected={selectedId === id}
                isDragging={draggingId === id}
                hasChildren={node.children.length > 0}
                onSelect={handleSelectNode}
                onEditStart={handleEditStart}
                onEditEnd={handleEditEnd}
                onEditingId={editingId}
                onToggleCollapse={handleToggleCollapse}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
