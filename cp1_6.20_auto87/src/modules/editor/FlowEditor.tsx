import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  MarkerType,
  Handle,
  Position,
  type Connection,
  type Edge,
  type EdgeTypes,
  type Node as ReactFlowNode,
  type NodeMouseHandler,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  generateId,
  getStateManager,
  type NodeData,
  type NodeType,
  type FlowState,
} from '../utils/stateManager';
import { calculateLayout } from '../layout/AutoLayout';
import NodesPanel from './NodesPanel';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  start: '开始',
  process: '处理',
  decision: '判断',
  end: '结束',
};

const NODE_TYPE_ICONS: Record<NodeType, string> = {
  start: '▶',
  process: '⚙',
  decision: '◆',
  end: '■',
};

interface DraggedTemplate {
  type: NodeType;
  label: string;
  icon: string;
  color: string;
  defaultLabel: string;
}

const CustomNode: React.FC<{
  data: NodeData;
  id: string;
  selected: boolean;
}> = ({ data, id, selected }) => {
  const nodeClass = `custom-node node-${data.type}${selected ? ' selected' : ''}`;

  return (
    <div className={nodeClass} data-node-id={id}>
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle"
      />
      <div className="node-header">
        <div className="node-header-icon">{NODE_TYPE_ICONS[data.type]}</div>
        <span className="node-header-type">{NODE_TYPE_LABELS[data.type]}</span>
      </div>
      <div className="node-body">
        <div>{data.label || NODE_TYPE_LABELS[data.type]}</div>
        {data.description && (
          <div className="node-description">{data.description}</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="custom-handle"
      />
    </div>
  );
};

const EdgeDeleteButton: React.FC<{
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  onDelete: (id: string) => void;
}> = ({ id, sourceX, sourceY, targetX, targetY, onDelete }) => {
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <div
      className="edge-delete-btn"
      style={{ left: `${midX}px`, top: `${midY}px` }}
      onClick={(e) => {
        e.stopPropagation();
        onDelete(id);
      }}
      title="删除连线"
    >
      ×
    </div>
  );
};

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  markerEnd?: string;
  style?: React.CSSProperties;
  selected: boolean;
  data: { onDelete: (id: string) => void };
}

const CustomEdge: React.FC<CustomEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  selected,
  data,
}) => {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const controlOffset = Math.min(Math.abs(dx) * 0.5, Math.abs(dy) * 0.5, 100);

  const cx1 = sourceX;
  const cy1 = sourceY + controlOffset;
  const cx2 = targetX;
  const cy2 = targetY - controlOffset;

  const path = `M ${sourceX} ${sourceY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetX} ${targetY}`;

  const edgeClass = selected ? 'edge-selected' : '';

  return (
    <g className={edgeClass}>
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ pointerEvents: 'stroke' }}
      />
      <path
        id={id}
        d={path}
        fill="none"
        stroke={selected ? '#5a67d8' : '#a0aec0'}
        strokeWidth={selected ? 3 : 2}
        markerEnd={markerEnd}
        style={style}
      />
      {selected && (
        <EdgeDeleteButton
          id={id}
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
          onDelete={data?.onDelete || (() => {})}
        />
      )}
    </g>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const Toolbar: React.FC<{
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAutoLayout: () => void;
  onExport: () => void;
  onImport: () => void;
}> = ({ canUndo, canRedo, onUndo, onRedo, onAutoLayout, onExport, onImport }) => {
  return (
    <div className="toolbar">
      <button
        className="toolbar-btn"
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
        <span className="toolbar-btn-label">撤销</span>
      </button>
      <button
        className="toolbar-btn"
        onClick={onRedo}
        disabled={!canRedo}
        title="重做 (Ctrl+Y)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span className="toolbar-btn-label">重做</span>
      </button>
      <div className="toolbar-divider"></div>
      <button
        className="toolbar-btn"
        onClick={onAutoLayout}
        title="自动布局"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
          <line x1="11" y1="10" x2="13" y2="10"></line>
          <line x1="17" y1="11" x2="17" y2="13"></line>
        </svg>
        <span className="toolbar-btn-label">布局</span>
      </button>
      <div className="toolbar-divider"></div>
      <button
        className="toolbar-btn"
        onClick={onImport}
        title="导入流程图"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span className="toolbar-btn-label">导入</span>
      </button>
      <button
        className="toolbar-btn"
        onClick={onExport}
        title="导出流程图"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span className="toolbar-btn-label">导出</span>
      </button>
    </div>
  );
};

interface PropertiesPanelProps {
  open: boolean;
  node: ReactFlowNode<NodeData> | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ReactFlowNode<NodeData>>) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  open,
  node,
  onClose,
  onUpdate,
}) => {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<NodeType>('process');
  const [description, setDescription] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (node) {
      setLabel(node.data.label);
      setType(node.data.type);
      setDescription(node.data.description);
    }
  }, [node]);

  useEffect(() => {
    if (!open || !node) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current && !panelRef.current.contains(target)) {
        if (target.closest('.custom-node')) return;
        saveAndClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, node, label, type, description]);

  const saveAndClose = useCallback(() => {
    if (node) {
      onUpdate(node.id, {
        data: {
          label,
          type,
          description: description.slice(0, 200),
        },
      });
    }
    onClose();
  }, [node, label, type, description, onClose, onUpdate]);

  if (!node) return null;

  return (
    <div
      ref={panelRef}
      className={`properties-panel${open ? ' open' : ''}`}
    >
      <div className="properties-panel-header">
        <div className="properties-panel-title">节点属性</div>
        <button
          className="properties-panel-close"
          onClick={saveAndClose}
          title="关闭"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div className="properties-panel-body">
        <div className="form-field">
          <label className="form-label">节点名称</label>
          <input
            type="text"
            value={label}
            placeholder="请输入节点名称"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label className="form-label">节点类型</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as NodeType)}
          >
            <option value="start">开始</option>
            <option value="process">处理</option>
            <option value="decision">判断</option>
            <option value="end">结束</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">节点描述</label>
          <textarea
            value={description}
            placeholder="请输入节点描述（最多200字）"
            maxLength={200}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
          />
          <div className="char-count">{description.length}/200</div>
        </div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-title">{title}</div>
        <div className="confirm-dialog-message">{message}</div>
        <div className="confirm-dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

const FlowEditorInner: React.FC = () => {
  const stateManager = useMemo(() => getStateManager(), []);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(
    stateManager.getNodes()
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    stateManager.getEdges()
  );

  const [canUndo, setCanUndo] = useState(stateManager.canUndo());
  const [canRedo, setCanRedo] = useState(stateManager.canRedo());
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    nodes: ReactFlowNode<NodeData>[];
    edges: Edge[];
  } | null>(null);
  const lastDragEndPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map()
  );

  const edgeTypes = useMemo<EdgeTypes>(() => {
    const handleDeleteEdge = (edgeId: string) => {
      stateManager.deleteEdge(edgeId);
    };
    return {
      custom: (props) => (
        <CustomEdge
          {...props}
          data={{ onDelete: handleDeleteEdge }}
          markerEnd={{
            type: MarkerType.ArrowClosed,
            width: 8,
            height: 8,
            color: props.selected ? '#5a67d8' : '#a0aec0',
          }}
        />
      ),
    };
  }, [stateManager]);

  useEffect(() => {
    const unsubscribe = stateManager.subscribe((state: FlowState) => {
      setNodes(state.nodes);
      setEdges(state.edges);
      setCanUndo(stateManager.canUndo());
      setCanRedo(stateManager.canRedo());
    });
    return unsubscribe;
  }, [stateManager, setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        stateManager.undo();
      } else if (
        (isCtrl && e.key.toLowerCase() === 'y') ||
        (isCtrl && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        stateManager.redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
        const selectedNodeId = stateManager.getSelectedNodeId();
        const selectedEdgeId = stateManager.getSelectedEdgeId();
        if (selectedNodeId) {
          e.preventDefault();
          stateManager.deleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          e.preventDefault();
          stateManager.deleteEdge(selectedEdgeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stateManager]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      const edge: Edge = {
        id: generateId('edge'),
        source: connection.source,
        target: connection.target,
        type: 'custom',
        sourceHandle: connection.sourceHandle || null,
        targetHandle: connection.targetHandle || null,
      };
      stateManager.addEdge(edge);
    },
    [stateManager]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const rawData = e.dataTransfer.getData('application/reactflow');
      if (!rawData) return;

      const template: DraggedTemplate = JSON.parse(rawData);
      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const newNode: Node<NodeData> = {
        id: generateId('node'),
        type: 'custom',
        position: {
          x: Math.round(position.x - NODE_WIDTH / 2),
          y: Math.round(position.y - NODE_HEIGHT / 2),
        },
        data: {
          label: template.defaultLabel,
          type: template.type,
          description: '',
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };

      stateManager.addNode(newNode);
    },
    [screenToFlowPosition, stateManager]
  );

  const onNodeMouseDown: NodeMouseHandler = useCallback(
    (_e, node) => {
      stateManager.setSelectedNode(node.id);
      lastDragEndPositions.current.clear();
    },
    [stateManager]
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_e, node) => {
      setEditingNodeId(node.id);
      setPropertiesOpen(true);
    },
    []
  );

  const handleNodesChange = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);

      const positionChanges = changes.filter(
        (c) => c.type === 'position' && c.dragging === false && c.position
      );

      if (positionChanges.length > 0) {
        const updates = new Map<string, Partial<Node<NodeData>>>();
        positionChanges.forEach((change) => {
          const node = stateManager.getNodes().find((n) => n.id === change.id);
          if (node) {
            updates.set(change.id, {
              position: {
                x: Math.round(change.position.x),
                y: Math.round(change.position.y),
              },
            });
          }
        });
        if (updates.size > 0) {
          stateManager.updateNodes(updates);
        }
      }

      const removeChanges = changes.filter((c) => c.type === 'remove');
      removeChanges.forEach((change) => {
        stateManager.deleteNode(change.id);
      });
    },
    [onNodesChange, stateManager]
  );

  const handleEdgesChange = useCallback(
    (changes: any[]) => {
      onEdgesChange(changes);

      const selectChanges = changes.filter((c) => c.type === 'select');
      selectChanges.forEach((change) => {
        if (change.selected) {
          stateManager.setSelectedEdge(change.id);
        }
      });

      const removeChanges = changes.filter((c) => c.type === 'remove');
      removeChanges.forEach((change) => {
        stateManager.deleteEdge(change.id);
      });
    },
    [onEdgesChange, stateManager]
  );

  const onPaneClick = useCallback(() => {
    stateManager.clearSelection();
    setPropertiesOpen(false);
    setEditingNodeId(null);
  }, [stateManager]);

  const handleUndo = useCallback(() => {
    stateManager.undo();
  }, [stateManager]);

  const handleRedo = useCallback(() => {
    stateManager.redo();
  }, [stateManager]);

  const handleAutoLayout = useCallback(async () => {
    const currentNodes = stateManager.getNodes();
    const currentEdges = stateManager.getEdges();

    if (currentNodes.length === 0) return;

    const result = calculateLayout(currentNodes, currentEdges, {
      rankDirection: 'TB',
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      rankSeparation: 80,
      nodeSeparation: 60,
    });

    if (currentNodes.length <= 1) {
      const updates = new Map<string, Partial<Node<NodeData>>>();
      result.nodes.forEach((n) => {
        updates.set(n.id, {
          position: n.position,
          sourcePosition: n.sourcePosition,
          targetPosition: n.targetPosition,
        });
      });
      stateManager.updateNodes(updates);
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
      return;
    }

    const duration = 300;
    const nodeMap = new Map(result.nodes.map((n) => [n.id, n]));
    const startTime = performance.now();
    let rafId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const updates = new Map<string, Partial<Node<NodeData>>>();
      let hasChanges = false;

      currentNodes.forEach((fromNode) => {
        const toNode = nodeMap.get(fromNode.id);
        if (!toNode) return;

        const lastPos = lastDragEndPositions.current.get(fromNode.id);
        const fromX = lastPos?.x ?? fromNode.position.x;
        const fromY = lastPos?.y ?? fromNode.position.y;

        const x = fromX + (toNode.position.x - fromX) * eased;
        const y = fromY + (toNode.position.y - fromY) * eased;

        const roundedX = Math.round(x);
        const roundedY = Math.round(y);

        const currentNode = stateManager
          .getNodes()
          .find((n) => n.id === fromNode.id);
        if (
          !currentNode ||
          currentNode.position.x !== roundedX ||
          currentNode.position.y !== roundedY
        ) {
          hasChanges = true;
          updates.set(fromNode.id, {
            position: { x: roundedX, y: roundedY },
            sourcePosition: toNode.sourcePosition,
            targetPosition: toNode.targetPosition,
          });
        }
      });

      if (hasChanges && updates.size > 0) {
        const prevNodes = stateManager.getNodes();
        prevNodes.forEach((n) => {
          lastDragEndPositions.current.set(n.id, {
            x: n.position.x,
            y: n.position.y,
          });
        });

        stateManager.updateNodes(updates);
      }

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        const finalUpdates = new Map<string, Partial<Node<NodeData>>>();
        result.nodes.forEach((n) => {
          finalUpdates.set(n.id, {
            position: n.position,
            sourcePosition: n.sourcePosition,
            targetPosition: n.targetPosition,
          });
        });
        stateManager.updateNodes(finalUpdates);
        lastDragEndPositions.current.clear();
        setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
      }
    };

    rafId = requestAnimationFrame(animate);
  }, [stateManager, fitView]);

  const handleExport = useCallback(() => {
    const currentNodes = stateManager.getNodes();
    const currentEdges = stateManager.getEdges();

    const data = {
      nodes: currentNodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: currentEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
      })),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [stateManager]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (!data.nodes || !Array.isArray(data.nodes)) {
            throw new Error('Invalid file format: nodes array missing');
          }
          if (!data.edges || !Array.isArray(data.edges)) {
            throw new Error('Invalid file format: edges array missing');
          }

          const parsedNodes: Node<NodeData>[] = data.nodes.map((n: any) => ({
            id: n.id,
            type: n.type || 'custom',
            position: n.position,
            data: n.data,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
          }));

          const parsedEdges: Edge[] = data.edges.map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type || 'custom',
          }));

          setPendingImport({ nodes: parsedNodes, edges: parsedEdges });
          setImportDialogOpen(true);
        } catch (err) {
          alert('文件解析失败，请选择有效的 flow.json 文件。');
        }
      };
      reader.readAsText(file);

      e.target.value = '';
    },
    []
  );

  const handleConfirmImport = useCallback(() => {
    if (pendingImport) {
      stateManager.replaceAll(pendingImport.nodes, pendingImport.edges);
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
    }
    setImportDialogOpen(false);
    setPendingImport(null);
  }, [pendingImport, stateManager, fitView]);

  const handleCancelImport = useCallback(() => {
    setImportDialogOpen(false);
    setPendingImport(null);
  }, []);

  const handleUpdateNode = useCallback(
    (id: string, updates: Partial<Node<NodeData>>) => {
      stateManager.updateNode(id, updates);
    },
    [stateManager]
  );

  const handleCloseProperties = useCallback(() => {
    setPropertiesOpen(false);
    setEditingNodeId(null);
  }, []);

  const editingNode = editingNodeId
    ? nodes.find((n) => n.id === editingNodeId) || null
    : null;

  return (
    <div className="app-container">
      <NodesPanel />
      <div className="editor-wrapper" ref={reactFlowWrapper}>
        <Toolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAutoLayout={handleAutoLayout}
          onExport={handleExport}
          onImport={handleImportClick}
        />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeMouseDown={onNodeMouseDown}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="react-flow-container"
          defaultEdgeOptions={{
            type: 'custom',
          }}
          nodesDraggable
          nodesConnectable
          elementsSelectable
          panOnScroll
          selectionOnDrag={false}
        >
          <Background variant="dots" gap={20} size={0.5} color="#e2e8f0" />
          <Controls
            showInteractive={false}
            position="bottom-right"
          />
          <MiniMap
            zoomable
            pannable
            position="bottom-left"
            nodeColor={(node) => {
              const type = (node.data as NodeData)?.type;
              switch (type) {
                case 'start':
                  return '#48bb78';
                case 'process':
                  return '#5a67d8';
                case 'decision':
                  return '#ed8936';
                case 'end':
                  return '#e53e3e';
                default:
                  return '#cbd5e0';
              }
            }}
            maskColor="rgba(244, 246, 248, 0.7)"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
            }}
          />
        </ReactFlow>
        <PropertiesPanel
          open={propertiesOpen}
          node={editingNode}
          onClose={handleCloseProperties}
          onUpdate={handleUpdateNode}
        />
        <ConfirmDialog
          open={importDialogOpen}
          title="导入流程图"
          message="导入将替换当前画布上的所有内容，此操作无法撤销。是否继续？"
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden-file-input"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

const FlowEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <FlowEditorInner />
    </ReactFlowProvider>
  );
};

export default FlowEditor;
